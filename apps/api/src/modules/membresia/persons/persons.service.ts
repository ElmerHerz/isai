import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { CreatePersonRelationshipDto } from './dto/create-person-relationship.dto';
import { CreatePersonMilestoneDto } from './dto/create-person-milestone.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

// Tope de filas por importación — de sobra para cualquier congregación real,
// evita procesar un archivo gigante por error o de mala fe.
const MAX_IMPORT_ROWS = 2000;

const RELATIONSHIP_TYPE_CATALOG_CODE = 'relationship_type';

// Al mostrar una relación desde el lado "relatedPerson" de la fila hay que
// voltear el tipo — la fila "A es PADRE_MADRE de B" vista desde B se lee
// "A es su HIJO"... al revés: A es su padre, así que el tipo que se le
// muestra a B es el opuesto de lo que se guardó desde A. Ver findRelationships.
const RELATIONSHIP_INVERSE: Record<string, string> = {
  CONYUGE: 'CONYUGE',
  PADRE_MADRE: 'HIJO',
  HIJO: 'PADRE_MADRE',
  HERMANO: 'HERMANO',
  TUTOR: 'PUPILO',
  PUPILO: 'TUTOR',
  OTRO: 'OTRO',
};

export interface ImportPreviewRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  status: 'ok' | 'duplicate' | 'invalid';
  reason?: string;
  duplicateOf?: { id: string; name: string };
}

interface ImportColumnMap {
  firstName?: number;
  secondName?: number;
  lastName?: number;
  secondLastName?: number;
}

// tenantId vive directo en la fila (ver membresia.prisma) por performance de
// RLS, pero NUNCA se deriva del cliente — siempre del tenant activo de la
// request, igual que institutionId siempre se valida contra ese tenant antes
// de escribir. No hay un @RequireScope() aquí (rutas planas, sin
// institutionId fijo en la URL) — el chequeo de scope va inline, mismo
// criterio que institutions.service.ts.
@Injectable()
export class PersonsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInstitutionAccessible(
    institutionId: string,
    tenantId: string | null,
    user: RequestUser,
  ) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!institution) {
      throw new BadRequestException(`Institución "${institutionId}" no encontrada`);
    }

    if (!user.isSuperadmin) {
      const scope = await resolveInstitutionScope(this.prisma, user);
      if (!scope.unrestricted && !scope.institutionIds.includes(institutionId)) {
        throw new ForbiddenException('No tienes alcance sobre esa institución.');
      }
    }

    return institution;
  }

  // Además de validar que la sucursal pertenezca a la institución, valida
  // que quien escribe tenga alcance sobre ESA sucursal (resolveBranchScope)
  // — sin esto, un usuario con scope restringido a la sucursal A podría
  // crear/mover una persona a la sucursal B de la misma institución, fuera
  // de su propio alcance. Hallazgo de auditoría de sesión (antes no
  // explotable por falta de UI que asigne scope de sucursal, pero el
  // service ya no debe depender de eso).
  private async assertBranchBelongsToInstitution(
    branchId: string,
    institutionId: string,
    user: RequestUser,
  ) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId } });
    if (!branch) {
      throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
    }

    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });
      if (!branchScope.unrestricted && !branchScope.branchIds.includes(branchId)) {
        throw new ForbiddenException('No tienes alcance sobre esa sucursal.');
      }
    }
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.person.findMany({
      where: {
        institutionId,
        deletedAt: null,
        ...(branchScope.unrestricted
          ? {}
          : { OR: [{ branchId: null }, { branchId: { in: branchScope.branchIds } }] }),
      },
      include: { personType: true, branch: { select: { id: true, name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const person = await this.prisma.person.findFirst({
      where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      include: { personType: true, branch: { select: { id: true, name: true } } },
    });
    if (!person) throw new NotFoundException(`Persona "${id}" no encontrada`);

    if (!user.isSuperadmin) {
      const institutionScope = await resolveInstitutionScope(this.prisma, user);
      if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(person.institutionId)) {
        throw new NotFoundException(`Persona "${id}" no encontrada`);
      }

      if (person.branchId) {
        const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: person.institutionId });
        if (!branchScope.unrestricted && !branchScope.branchIds.includes(person.branchId)) {
          throw new NotFoundException(`Persona "${id}" no encontrada`);
        }
      }
    }

    return person;
  }

  // Grupos de los que la persona es miembro ACTUAL (leftAt null) — usado por
  // la página de detalle de la persona, no por el flujo de un grupo
  // específico (ese ya tiene su propio listMembers en groups.service.ts).
  async findGroups(id: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    return this.prisma.groupMember.findMany({
      where: { personId: id, leftAt: null },
      include: {
        group: { select: { id: true, name: true, groupType: { select: { name: true } } } },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  // Cargos de directiva de la persona, vigentes y pasados (a diferencia de
  // findGroups no se filtra por vigencia — el historial de cargos importa).
  async findPositions(id: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    return this.prisma.groupPosition.findMany({
      where: { personId: id },
      include: {
        group: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
      orderBy: { termStart: 'desc' },
    });
  }

  async create(tenantId: string | null, dto: CreatePersonDto, user: RequestUser) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la persona.');
    }

    await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId, user);
    }

    const { birthDate, joinDate, ...rest } = dto;

    return this.prisma.person.create({
      data: {
        ...rest,
        tenantId,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        joinDate: joinDate ? new Date(joinDate) : undefined,
      },
      include: { personType: true, branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdatePersonDto, user: RequestUser) {
    const person = await this.findOne(id, tenantId, user);

    const institutionId = dto.institutionId ?? person.institutionId;
    if (dto.institutionId) {
      await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    }
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, institutionId, user);
    }

    const { birthDate, joinDate, ...rest } = dto;

    return this.prisma.person.update({
      where: { id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        joinDate: joinDate ? new Date(joinDate) : undefined,
      },
      include: { personType: true, branch: { select: { id: true, name: true } } },
    });
  }

  // --- Carga masiva por Excel ---------------------------------------------

  // "Primer Nombre" -> "primer nombre" (sin acentos, sin *, sin mayúsculas)
  // para poder mapear columnas por nombre de encabezado en vez de posición.
  private normalizeHeader(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
  }

  // Sin acentos, sin mayúsculas, espacios colapsados — la base para
  // cualquier comparación de nombres (completos o solo el "núcleo").
  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeName(firstName: string, lastName: string): string {
    return this.normalizeText(`${firstName} ${lastName}`);
  }

  // Primer nombre + primer apellido, normalizado — a diferencia de
  // normalizeName (nombre COMPLETO tal cual viene), esto es estable aunque
  // una fila traiga "Segundo Nombre"/"Segundo Apellido" y la otra no (ej.
  // alguien cargado a mano solo con "Marbely" + "Gonzales", el mismo en el
  // Excel como "Marbely Abigail" + "González Pérez" — el núcleo coincide
  // aunque el nombre completo no).
  private coreName(firstName: string, lastName: string): string {
    const firstWord = (value: string) => this.normalizeText(value).split(' ')[0] ?? '';
    return `${firstWord(firstName)} ${firstWord(lastName)}`.trim();
  }

  // Distancia de edición clásica (sin librería — es un algoritmo de ~15
  // líneas, no amerita una dependencia nueva). Se usa solo sobre el
  // "núcleo" del nombre (corto), nunca sobre el nombre completo, para que
  // el costo por fila se mantenga chico.
  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i]![j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1]![j - 1]!
            : 1 + Math.min(dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
    return dp[a.length]![b.length]!;
  }

  // Tolerancia de edición según el largo del núcleo — nombres cortos exigen
  // coincidencia casi exacta (evita falsos positivos tipo "Ana" ~ "Ada");
  // nombres más largos toleran 1-2 caracteres (cubre variantes reales de
  // ortografía como "Gonzáles"/"González").
  private fuzzyThreshold(core: string): number {
    if (core.length <= 4) return 0;
    if (core.length <= 8) return 1;
    return 2;
  }

  private buildColumnMap(headerRow: ExcelJS.Row): ImportColumnMap {
    const map: ImportColumnMap = {};
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = this.normalizeHeader(String(cell.text ?? ''));
      if (header === 'primer nombre' || header === 'nombre') map.firstName = colNumber;
      else if (header === 'segundo nombre') map.secondName = colNumber;
      else if (header === 'primer apellido' || header === 'apellido') map.lastName = colNumber;
      else if (header === 'segundo apellido') map.secondLastName = colNumber;
    });
    return map;
  }

  private cellText(row: ExcelJS.Row, colNumber?: number): string {
    if (!colNumber) return '';
    return String(row.getCell(colNumber).text ?? '').trim();
  }

  // Solo lee y compara contra lo existente — no escribe nada en la base.
  async previewImport(
    tenantId: string | null,
    institutionId: string,
    branchId: string | undefined,
    user: RequestUser,
    buffer: Buffer,
  ): Promise<ImportPreviewRow[]> {
    if (!tenantId) {
      throw new BadRequestException(
        'Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la importación.',
      );
    }

    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    if (branchId) {
      await this.assertBranchBelongsToInstitution(branchId, institutionId, user);
    }

    const workbook = new ExcelJS.Workbook();
    // exceljs trae anidado su propio @types/node (vía fast-csv, más viejo
    // que el del proyecto) — su firma de Buffer no es la misma nominal que
    // la de aquí aunque sean estructuralmente idénticas en runtime.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('El archivo no tiene ninguna hoja con datos.');
    }

    const columns = this.buildColumnMap(worksheet.getRow(1));
    if (!columns.firstName || !columns.lastName) {
      throw new BadRequestException(
        'No se encontraron las columnas "Primer Nombre" y "Primer Apellido" en la primera fila del archivo.',
      );
    }

    const existing = await this.prisma.person.findMany({
      where: { institutionId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    const existingByName = new Map<string, { id: string; name: string }>();
    const existingByCore = new Map<string, { id: string; name: string }>();
    const existingCoreList: { core: string; id: string; name: string }[] = [];
    for (const p of existing) {
      const match = { id: p.id, name: `${p.firstName} ${p.lastName}` };
      existingByName.set(this.normalizeName(p.firstName, p.lastName), match);
      const core = this.coreName(p.firstName, p.lastName);
      existingByCore.set(core, match);
      existingCoreList.push({ core, ...match });
    }

    const result: ImportPreviewRow[] = [];
    const seenInFile = new Map<string, number>();
    const lastRowNumber = Math.min(worksheet.rowCount, MAX_IMPORT_ROWS + 1);

    for (let rowNumber = 2; rowNumber <= lastRowNumber; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const firstNamePart = this.cellText(row, columns.firstName);
      const secondNamePart = this.cellText(row, columns.secondName);
      const lastNamePart = this.cellText(row, columns.lastName);
      const secondLastNamePart = this.cellText(row, columns.secondLastName);

      if (!firstNamePart && !lastNamePart) continue; // fila vacía, se ignora sin reportar

      const firstName = [firstNamePart, secondNamePart].filter(Boolean).join(' ');
      const lastName = [lastNamePart, secondLastNamePart].filter(Boolean).join(' ');

      if (!firstNamePart || !lastNamePart) {
        result.push({
          rowNumber,
          firstName,
          lastName,
          status: 'invalid',
          reason: !firstNamePart ? 'Falta el primer nombre' : 'Falta el primer apellido',
        });
        continue;
      }

      const key = this.normalizeName(firstName, lastName);
      const core = this.coreName(firstName, lastName);
      const fileMatchRow = seenInFile.get(key);

      // Tres niveles, del más al menos preciso: nombre completo exacto →
      // mismo primer nombre/apellido (cubre segundo nombre/apellido de más
      // o de menos) → parecido por distancia de edición (cubre variantes de
      // ortografía como "Gonzáles"/"González").
      let duplicateOf = existingByName.get(key);
      let reason = duplicateOf ? 'Ya existe una persona con este nombre' : undefined;

      if (!duplicateOf) {
        duplicateOf = existingByCore.get(core);
        if (duplicateOf) {
          reason = `Coincide en nombre y apellido con "${duplicateOf.name}" — revisa si es la misma persona`;
        }
      }

      if (!duplicateOf) {
        const threshold = this.fuzzyThreshold(core);
        if (threshold > 0) {
          for (const candidate of existingCoreList) {
            if (this.levenshtein(core, candidate.core) <= threshold) {
              duplicateOf = candidate;
              reason = `Nombre parecido a "${candidate.name}" — revisa si es la misma persona`;
              break;
            }
          }
        }
      }

      if (duplicateOf) {
        result.push({ rowNumber, firstName, lastName, status: 'duplicate', reason, duplicateOf });
      } else if (fileMatchRow) {
        result.push({
          rowNumber,
          firstName,
          lastName,
          status: 'duplicate',
          reason: `Repetido en la fila ${fileMatchRow} del mismo archivo`,
        });
      } else {
        result.push({ rowNumber, firstName, lastName, status: 'ok' });
        seenInFile.set(key, rowNumber);
      }
    }

    return result;
  }

  // Crea exactamente las filas que el usuario confirmó — no vuelve a leer el
  // archivo (el frontend ya tiene la previsualización en memoria).
  async confirmImport(tenantId: string | null, dto: ConfirmImportDto, user: RequestUser) {
    if (!tenantId) {
      throw new BadRequestException(
        'Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la importación.',
      );
    }

    await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId, user);
    }

    const { count } = await this.prisma.person.createMany({
      data: dto.rows.map((row) => ({
        tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        personTypeId: dto.personTypeId,
        firstName: row.firstName,
        lastName: row.lastName,
      })),
    });

    return { created: count };
  }

  // --- Núcleo familiar --------------------------------------------------

  async findRelationships(id: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    const [rows, types] = await Promise.all([
      this.prisma.personRelationship.findMany({
        where: { OR: [{ personId: id }, { relatedPersonId: id }] },
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
          relatedPerson: { select: { id: true, firstName: true, lastName: true } },
          relationshipType: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.catalogItem.findMany({
        where: { catalogCode: RELATIONSHIP_TYPE_CATALOG_CODE },
        select: { code: true, name: true },
      }),
    ]);

    const nameByCode = new Map(types.map((t) => [t.code, t.name]));

    return rows.map((row) => {
      const viewingFromPersonSide = row.personId === id;
      const relative = viewingFromPersonSide ? row.relatedPerson : row.person;
      const typeCode = viewingFromPersonSide
        ? row.relationshipType.code
        : (RELATIONSHIP_INVERSE[row.relationshipType.code] ?? row.relationshipType.code);

      return {
        id: row.id,
        relatedPerson: relative,
        relationshipType: { code: typeCode, name: nameByCode.get(typeCode) ?? row.relationshipType.name },
        notes: row.notes,
        createdAt: row.createdAt,
      };
    });
  }

  async createRelationship(id: string, tenantId: string | null, dto: CreatePersonRelationshipDto, user: RequestUser) {
    const person = await this.findOne(id, tenantId, user);

    if (dto.relatedPersonId === id) {
      throw new BadRequestException('Una persona no puede tener una relación consigo misma.');
    }

    // La otra persona debe existir, ser visible para este usuario (findOne
    // ya aplica el mismo chequeo de scope) y pertenecer a la misma
    // institución — no tiene sentido una relación familiar cruzando
    // instituciones distintas.
    const relatedPerson = await this.findOne(dto.relatedPersonId, tenantId, user);
    if (relatedPerson.institutionId !== person.institutionId) {
      throw new BadRequestException('La persona relacionada debe pertenecer a la misma institución.');
    }

    const relationshipType = await this.prisma.catalogItem.findFirst({
      where: { id: dto.relationshipTypeId, catalogCode: RELATIONSHIP_TYPE_CATALOG_CODE },
    });
    if (!relationshipType) {
      throw new BadRequestException('Tipo de relación no válido.');
    }

    await this.prisma.personRelationship.create({
      data: {
        personId: id,
        relatedPersonId: dto.relatedPersonId,
        relationshipTypeId: dto.relationshipTypeId,
        notes: dto.notes,
      },
    });

    return this.findRelationships(id, tenantId, user);
  }

  async removeRelationship(id: string, relationshipId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    const row = await this.prisma.personRelationship.findFirst({
      where: { id: relationshipId, OR: [{ personId: id }, { relatedPersonId: id }] },
    });
    if (!row) throw new NotFoundException(`Relación "${relationshipId}" no encontrada`);

    await this.prisma.personRelationship.delete({ where: { id: relationshipId } });
  }

  // --- Hitos espirituales -------------------------------------------------
  // Exclusivo de instituciones tipo "church" — ver comentario en
  // membresia.prisma sobre MilestoneType.

  private async assertChurchInstitution(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { typeCode: true },
    });
    if (institution?.typeCode !== 'church') {
      throw new BadRequestException('Los hitos espirituales solo aplican a instituciones de tipo iglesia.');
    }
  }

  async findMilestones(id: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    return this.prisma.personMilestone.findMany({
      where: { personId: id },
      include: { milestoneType: { select: { id: true, code: true, name: true } } },
      orderBy: { occurredOn: 'desc' },
    });
  }

  async createMilestone(id: string, tenantId: string | null, dto: CreatePersonMilestoneDto, user: RequestUser) {
    const person = await this.findOne(id, tenantId, user);
    await this.assertChurchInstitution(person.institutionId);

    const milestoneType = await this.prisma.milestoneType.findFirst({
      where: { id: dto.milestoneTypeId, tenantId: person.tenantId },
    });
    if (!milestoneType) {
      throw new BadRequestException('Tipo de hito no válido.');
    }

    return this.prisma.personMilestone.create({
      data: {
        personId: id,
        milestoneTypeId: dto.milestoneTypeId,
        occurredOn: new Date(dto.occurredOn),
        notes: dto.notes,
      },
      include: { milestoneType: { select: { id: true, code: true, name: true } } },
    });
  }

  async removeMilestone(id: string, milestoneId: string, tenantId: string | null, user: RequestUser) {
    await this.findOne(id, tenantId, user);

    const row = await this.prisma.personMilestone.findFirst({ where: { id: milestoneId, personId: id } });
    if (!row) throw new NotFoundException(`Hito "${milestoneId}" no encontrado`);

    await this.prisma.personMilestone.delete({ where: { id: milestoneId } });
  }

  buildTemplateWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Miembros');
    sheet.columns = [
      { header: 'Primer Nombre*', key: 'firstName', width: 22 },
      { header: 'Segundo Nombre', key: 'secondName', width: 22 },
      { header: 'Primer Apellido*', key: 'lastName', width: 22 },
      { header: 'Segundo Apellido', key: 'secondLastName', width: 22 },
    ];
    sheet.addRow({
      firstName: 'Elmer',
      secondName: 'Giovanni',
      lastName: 'Raymundo',
      secondLastName: 'Hernández',
    });
    return workbook;
  }
}
