import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { resolveAllBranchesScope, branchScopeSql } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';
// Regla contable estándar — el signo natural de cada tipo de cuenta no lo
// elige el usuario, se deriva del tipo para no dejar crear una cuenta con
// el signo equivocado por error.
const NORMAL_BALANCE_BY_ACCOUNT_TYPE: Record<string, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
};

// Alta/edición limitada a esto por ahora: crear cuentas nuevas, transaccionables
// por defecto o de agrupación (allowsTransactions=false, ej. "4000 Ingresos"
// como encabezado sin movimientos propios) si se indica explícitamente. El
// resto sigue de solo lectura, ver plan de sesión.
@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string | null, user: RequestUser) {
    if (!tenantId) return [];

    // El catálogo de cuentas (nombres/códigos) es tenant-wide a propósito —
    // no es sensible por sucursal. El SALDO sí: un usuario restringido a una
    // sucursal solo debe ver lo contabilizado ahí, no el total del tenant
    // (hallazgo de sesión: AccountsService no filtraba alcance en absoluto).
    const scope = await resolveAllBranchesScope(this.prisma, user);
    const scopeFilter = branchScopeSql(scope, 'e.institution_id', 'e.branch_id');

    const [accounts, balanceRows] = await Promise.all([
      this.prisma.account.findMany({
        where: { tenantId },
        include: { accountType: { select: { code: true, name: true } } },
        orderBy: { code: 'asc' },
      }),
      // Saldo en el signo "natural" de cada cuenta, no siempre debe-haber:
      // para una cuenta de Débito (Activo/Gasto) el saldo positivo normal es
      // debe-haber, pero para una de Crédito (Pasivo/Patrimonio/Ingreso) es
      // al revés (haber-debe) — sin este CASE, toda cuenta de Ingreso
      // mostraba su saldo en negativo aunque tuviera actividad normal
      // (hallazgo de sesión: "Ofrendas" con $39.80 acreditados mostraba
      // -$39.80). Se calcula acá (no en cada request del catálogo entero se
      // recalcula, pero con el volumen de este tenant no es un problema de
      // performance real todavía).
      this.prisma.$queryRaw<{ account_id: string; balance: string }[]>`
        SELECT l.account_id, COALESCE(SUM(
          CASE WHEN e.status != 'posted' THEN 0
            WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
            ELSE l.debit_amount - l.credit_amount
          END
        ), 0)::text AS balance
        FROM finanzas.journal_entry_lines l
        JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
        JOIN finanzas.accounts a ON a.id = l.account_id
        WHERE a.tenant_id = ${tenantId}::uuid AND ${scopeFilter}
        GROUP BY l.account_id
      `,
    ]);

    const balanceByAccountId = new Map(balanceRows.map((r) => [r.account_id, r.balance]));

    return accounts.map((account) => ({
      ...account,
      balance: balanceByAccountId.get(account.id) ?? '0.00',
    }));
  }

  async create(tenantId: string | null, dto: CreateAccountDto) {
    if (!tenantId) {
      throw new BadRequestException('Como superadmin, indica ?tenantId=<uuid> para especificar a qué tenant pertenece la cuenta.');
    }

    const accountType = await this.prisma.catalogItem.findFirst({
      where: { id: dto.accountTypeId, catalogCode: ACCOUNT_TYPE_CATALOG_CODE },
    });
    if (!accountType) {
      throw new BadRequestException('Tipo de cuenta no válido.');
    }

    if (dto.parentAccountId) {
      const parent = await this.prisma.account.findFirst({ where: { id: dto.parentAccountId, tenantId } });
      if (!parent) {
        throw new BadRequestException('La cuenta padre no pertenece a este tenant.');
      }
    }

    const exists = await this.prisma.account.findUnique({
      where: { uq_accounts_tenant_code: { tenantId, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(`Ya existe una cuenta con código "${dto.code}" en este tenant.`);
    }

    return this.prisma.account.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        accountTypeId: dto.accountTypeId,
        parentAccountId: dto.parentAccountId,
        normalBalance: NORMAL_BALANCE_BY_ACCOUNT_TYPE[accountType.code] ?? 'DEBIT',
        allowsTransactions: dto.allowsTransactions ?? true,
      },
      include: { accountType: { select: { code: true, name: true } } },
    });
  }

  // Nunca se permite cambiar accountTypeId (ver comentario en UpdateAccountDto)
  // — el resto sí es seguro de editar en cualquier momento, sin importar si
  // la cuenta ya tiene movimientos (renombrar/recodificar no afecta el
  // historial contable, solo cómo se presenta).
  async update(id: string, tenantId: string | null, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({ where: { id, tenantId: tenantId ?? undefined } });
    if (!account) throw new NotFoundException(`Cuenta "${id}" no encontrada`);

    if (dto.code && dto.code !== account.code) {
      const exists = await this.prisma.account.findUnique({
        where: { uq_accounts_tenant_code: { tenantId: account.tenantId, code: dto.code } },
      });
      if (exists) {
        throw new ConflictException(`Ya existe una cuenta con código "${dto.code}" en este tenant.`);
      }
    }

    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) {
        throw new BadRequestException('Una cuenta no puede ser padre de sí misma.');
      }
      const parent = await this.prisma.account.findFirst({ where: { id: dto.parentAccountId, tenantId: account.tenantId } });
      if (!parent) {
        throw new BadRequestException('La cuenta padre no pertenece a este tenant.');
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        parentAccountId: dto.parentAccountId,
        allowsTransactions: dto.allowsTransactions,
      },
      include: { accountType: { select: { code: true, name: true } } },
    });
  }

  // Deja que la propia FK de Postgres decida si se puede borrar — más de 10
  // tablas pueden referenciar una cuenta (líneas de asiento, cuentas por
  // defecto de sucursal, ingreso de proyecto, caja de grupo, etc.); en vez
  // de chequear cada una a mano, se intenta el delete y se traduce el error
  // de llave foránea a un mensaje claro.
  async remove(id: string, tenantId: string | null) {
    const account = await this.prisma.account.findFirst({ where: { id, tenantId: tenantId ?? undefined } });
    if (!account) throw new NotFoundException(`Cuenta "${id}" no encontrada`);

    try {
      await this.prisma.account.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException(
          `"${account.name}" ya está en uso (tiene movimientos u otra configuración que la referencia) — no se puede eliminar. Puedes desmarcarla como transaccionable si ya no se debe usar.`,
        );
      }
      throw err;
    }
  }
}
