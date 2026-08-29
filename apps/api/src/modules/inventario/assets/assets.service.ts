import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignCustodianDto } from './dto/assign-custodian.dto';
import { RelocateAssetDto } from './dto/relocate-asset.dto';
import { SetConditionDto } from './dto/set-condition.dto';
import { DisposeAssetDto } from './dto/dispose-asset.dto';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const include = {
  branch: { select: { id: true, name: true } },
  custodianPerson: { select: { id: true, firstName: true, lastName: true } },
};

// Registro de custodia (docs/comercio-mejoras-propuestas.md §6) — mismo
// esqueleto de institución/sucursal que BudgetsService. custodianPersonId
// SIEMPRE opcional (no toda institución asigna custodia individual) y nunca
// se pide al crear — "asignar custodio" es una acción aparte, ver abajo.
@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertInstitutionAccessible(institutionId: string, tenantId: string | null, user: RequestUser) {
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

  private async assertBranchBelongsToInstitution(branchId: string, institutionId: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, institutionId } });
    if (!branch) {
      throw new BadRequestException('La sucursal no pertenece a la institución indicada.');
    }
  }

  // Consulta directa a membresia.persons, sin importar un módulo de
  // Membresía — mismo criterio que ya usa ProjectsService para validar
  // personId (ver plan de sesión).
  private async assertPersonBelongsToInstitution(personId: string, institutionId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, institutionId, deletedAt: null },
    });
    if (!person) {
      throw new BadRequestException('Esa persona no pertenece a la institución de este activo.');
    }
  }

  // Enlace liviano y opcional a "de qué gasto salió" — consulta directa a
  // proyectos.project_expenses o finanzas.group_fund_expenses según el tipo,
  // mismo criterio de lectura cross-schema que ExpenseApprovalsService ya
  // usa para resolver la misma referencia polimórfica (sourceType/sourceId).
  private async assertSourceExists(sourceType: string, sourceId: string, tenantId: string) {
    if (sourceType === 'project_expense') {
      const expense = await this.prisma.projectExpense.findFirst({
        where: { id: sourceId, project: { tenantId } },
      });
      if (!expense) throw new BadRequestException('Ese gasto de proyecto no existe en este tenant.');
    } else if (sourceType === 'group_fund_expense') {
      const expense = await this.prisma.groupFundExpense.findFirst({
        where: { id: sourceId, group: { institution: { tenantId } } },
      });
      if (!expense) throw new BadRequestException('Ese gasto de fondo de grupo no existe en este tenant.');
    }
  }

  private async resolveSourceSummaries(
    assets: { id: string; sourceType: string | null; sourceId: string | null }[],
  ): Promise<Map<string, { description: string; amount: string; date: string }>> {
    const projectExpenseIds = assets.filter((a) => a.sourceType === 'project_expense' && a.sourceId).map((a) => a.sourceId!);
    const groupFundExpenseIds = assets.filter((a) => a.sourceType === 'group_fund_expense' && a.sourceId).map((a) => a.sourceId!);

    const [projectExpenses, groupFundExpenses] = await Promise.all([
      projectExpenseIds.length
        ? this.prisma.projectExpense.findMany({
            where: { id: { in: projectExpenseIds } },
            include: { account: { select: { name: true } } },
          })
        : [],
      groupFundExpenseIds.length
        ? this.prisma.groupFundExpense.findMany({
            where: { id: { in: groupFundExpenseIds } },
            include: { account: { select: { name: true } } },
          })
        : [],
    ]);
    const projectExpenseById = new Map(projectExpenses.map((e) => [e.id, e]));
    const groupFundExpenseById = new Map(groupFundExpenses.map((e) => [e.id, e]));

    const summaries = new Map<string, { description: string; amount: string; date: string }>();
    for (const asset of assets) {
      if (asset.sourceType === 'project_expense' && asset.sourceId) {
        const expense = projectExpenseById.get(asset.sourceId);
        if (expense) {
          summaries.set(asset.id, {
            description: `Gasto de proyecto — ${expense.notes ?? expense.account.name}`,
            amount: expense.amount.toString(),
            date: expense.incurredAt.toISOString().slice(0, 10),
          });
        }
      } else if (asset.sourceType === 'group_fund_expense' && asset.sourceId) {
        const expense = groupFundExpenseById.get(asset.sourceId);
        if (expense) {
          summaries.set(asset.id, {
            description: `Gasto de fondo de grupo — ${expense.notes ?? expense.account.name}`,
            amount: expense.amount.toString(),
            date: expense.movementDate.toISOString().slice(0, 10),
          });
        }
      }
    }
    return summaries;
  }

  private async findAssetOrThrow(id: string, tenantId: string | null) {
    const asset = await this.prisma.asset.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) }, include });
    if (!asset) throw new NotFoundException(`Activo "${id}" no encontrado`);
    return asset;
  }

  private async assertAssetAccessible(asset: { institutionId: string; branchId: string | null }, user: RequestUser) {
    if (user.isSuperadmin) return;

    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(asset.institutionId)) {
      throw new NotFoundException('Activo no encontrado');
    }

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: asset.institutionId });
    if (!branchScope.unrestricted && (!asset.branchId || !branchScope.branchIds.includes(asset.branchId))) {
      throw new NotFoundException('Activo no encontrado');
    }
  }

  private async getAccessibleAsset(id: string, tenantId: string | null, user: RequestUser) {
    const asset = await this.findAssetOrThrow(id, tenantId);
    await this.assertAssetAccessible(asset, user);
    return asset;
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);
    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    const assets = await this.prisma.asset.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { name: 'asc' },
    });

    const summaries = await this.resolveSourceSummaries(assets);
    return assets.map((a) => ({ ...a, sourceSummary: summaries.get(a.id) ?? null }));
  }

  async findOne(id: string, tenantId: string | null, user: RequestUser) {
    const asset = await this.getAccessibleAsset(id, tenantId, user);
    const summaries = await this.resolveSourceSummaries([asset]);
    return { ...asset, sourceSummary: summaries.get(asset.id) ?? null };
  }

  async create(tenantId: string | null, dto: CreateAssetDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');
    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);
    }
    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: dto.institutionId });
      if (!branchScope.unrestricted && (!dto.branchId || !branchScope.branchIds.includes(dto.branchId))) {
        throw new ForbiddenException('No tienes alcance para crear un activo fuera de tu sucursal.');
      }
    }
    if ((dto.sourceType && !dto.sourceId) || (!dto.sourceType && dto.sourceId)) {
      throw new BadRequestException('Indica tipo y gasto de origen juntos, o ninguno de los dos.');
    }
    if (dto.sourceType && dto.sourceId) {
      await this.assertSourceExists(dto.sourceType, dto.sourceId, institution.tenantId);
    }

    return this.prisma.asset.create({
      data: {
        tenantId: institution.tenantId,
        institutionId: dto.institutionId,
        branchId: dto.branchId,
        name: dto.name,
        categoryCode: dto.categoryCode,
        quantity: dto.quantity ?? 1,
        serialNumber: dto.serialNumber,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        acquisitionCost: dto.acquisitionCost,
        location: dto.location,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        notes: dto.notes,
      },
      include,
    });
  }

  async update(id: string, tenantId: string | null, dto: UpdateAssetDto, user: RequestUser) {
    const asset = await this.getAccessibleAsset(id, tenantId, user);
    if (dto.sourceType && dto.sourceId) {
      await this.assertSourceExists(dto.sourceType, dto.sourceId, asset.tenantId);
    }

    return this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name,
        categoryCode: dto.categoryCode,
        quantity: dto.quantity,
        serialNumber: dto.serialNumber,
        acquisitionDate: dto.acquisitionDate === undefined ? undefined : dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
        acquisitionCost: dto.acquisitionCost,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        notes: dto.notes,
        isActive: dto.isActive,
      },
      include,
    });
  }

  async getMovements(id: string, tenantId: string | null, user: RequestUser) {
    await this.getAccessibleAsset(id, tenantId, user);
    return this.prisma.assetMovement.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async assignCustodian(id: string, tenantId: string | null, dto: AssignCustodianDto, user: RequestUser) {
    const asset = await this.getAccessibleAsset(id, tenantId, user);
    if (dto.custodianPersonId) {
      await this.assertPersonBelongsToInstitution(dto.custodianPersonId, asset.institutionId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: dto.custodianPersonId ? 'assigned' : 'returned',
          fromCustodianPersonId: asset.custodianPersonId,
          toCustodianPersonId: dto.custodianPersonId ?? null,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });
      return tx.asset.update({ where: { id }, data: { custodianPersonId: dto.custodianPersonId ?? null }, include });
    });
  }

  async relocate(id: string, tenantId: string | null, dto: RelocateAssetDto, user: RequestUser) {
    const asset = await this.getAccessibleAsset(id, tenantId, user);

    return this.prisma.$transaction(async (tx) => {
      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: 'relocated',
          fromLocation: asset.location,
          toLocation: dto.location,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });
      return tx.asset.update({ where: { id }, data: { location: dto.location }, include });
    });
  }

  async setCondition(id: string, tenantId: string | null, dto: SetConditionDto, user: RequestUser) {
    await this.getAccessibleAsset(id, tenantId, user);

    return this.prisma.$transaction(async (tx) => {
      await tx.assetMovement.create({
        data: { assetId: id, movementType: 'condition_change', notes: dto.notes, createdBy: user.userId },
      });
      return tx.asset.update({ where: { id }, data: { condition: dto.condition }, include });
    });
  }

  async dispose(id: string, tenantId: string | null, dto: DisposeAssetDto, user: RequestUser) {
    await this.getAccessibleAsset(id, tenantId, user);

    return this.prisma.$transaction(async (tx) => {
      await tx.assetMovement.create({
        data: { assetId: id, movementType: 'disposed', notes: dto.notes, createdBy: user.userId },
      });
      return tx.asset.update({ where: { id }, data: { isActive: false }, include });
    });
  }
}
