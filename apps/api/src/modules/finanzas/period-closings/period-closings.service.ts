import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LedgerService, type LedgerLineInput } from '../ledger/ledger.service';
import { CreatePeriodClosingDto } from './dto/create-period-closing.dto';
import { ReopenPeriodClosingDto } from './dto/reopen-period-closing.dto';
import { resolveInstitutionScope, resolveBranchScope } from '../../../common/utils/institution-scope.util';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';

// closingEntryId es un FK sin @relation de Prisma a propósito (mismo
// criterio que JournalEntry.reversesEntryId) — no se puede incluir acá,
// solo viaja el id.
const include = {
  branch: { select: { id: true, name: true } },
  targetEquityAccount: { select: { id: true, code: true, name: true } },
  closedByUser: { select: { id: true, firstName: true, lastName: true } },
  reopenedByUser: { select: { id: true, firstName: true, lastName: true } },
};

interface ClosingBalanceRow {
  account_id: string;
  normal_balance: string;
  total: string;
}

// Cierre de periodo formal (docs/finanzas-mejoras-propuestas.md §9.1) —
// genera el asiento que mueve el neto de Ingreso/Gasto a Patrimonio y, vía
// LedgerService.assertPeriodOpen, bloquea contabilizar/anular hacia atrás
// de closedThroughDate. Mismo criterio de alcance que BudgetsService
// (institución obligatoria, sucursal opcional = toda la institución).
@Injectable()
export class PeriodClosingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

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

  private async getEquityAccount(accountId: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, tenantId },
      include: { accountType: { select: { catalogCode: true, code: true } } },
    });
    if (!account) {
      throw new BadRequestException('Esa cuenta no pertenece a este tenant.');
    }
    if (account.accountType.catalogCode !== ACCOUNT_TYPE_CATALOG_CODE || account.accountType.code !== 'EQUITY') {
      throw new BadRequestException('La cuenta destino del cierre debe ser de tipo Patrimonio.');
    }
    return account;
  }

  async findAll(institutionId: string, tenantId: string | null, user: RequestUser) {
    await this.assertInstitutionAccessible(institutionId, tenantId, user);

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });

    return this.prisma.periodClosing.findMany({
      where: {
        institutionId,
        ...(branchScope.unrestricted ? {} : { branchId: { in: branchScope.branchIds } }),
      },
      include,
      orderBy: { closedThroughDate: 'desc' },
    });
  }

  // Saldo por cuenta (Ingreso/Gasto) en su signo natural, scopeado a
  // institución/sucursal — mismo CASE que ReportsService.accountTotals, no
  // se reusa por ser private en otro servicio (mismo criterio que los
  // guards de arriba, ya duplicados entre servicios de Finanzas). No hace
  // falta acotar "desde el último cierre": el cierre anterior ya dejó esas
  // cuentas en cero hasta su propia fecha, así que sumar desde el origen ya
  // da exactamente lo no cerrado todavía.
  private async closingBalances(
    tenantId: string,
    institutionId: string,
    branchId: string | undefined,
    closedThroughDate: Date,
  ): Promise<ClosingBalanceRow[]> {
    return this.prisma.$queryRaw<ClosingBalanceRow[]>`
      SELECT l.account_id, a.normal_balance, COALESCE(SUM(
        CASE WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
             ELSE l.debit_amount - l.credit_amount END
      ), 0)::text AS total
      FROM finanzas.journal_entry_lines l
      JOIN finanzas.journal_entries e ON e.id = l.journal_entry_id
      JOIN finanzas.accounts a ON a.id = l.account_id
      JOIN general.catalog_items ct ON ct.id = a.account_type_id
      WHERE a.tenant_id = ${tenantId}::uuid AND e.status = 'posted'
        AND e.entry_date <= ${closedThroughDate}::date
        AND e.institution_id = ${institutionId}::uuid
        AND (${branchId ?? null}::uuid IS NULL OR e.branch_id = ${branchId ?? null}::uuid)
        AND ct.catalog_code = ${ACCOUNT_TYPE_CATALOG_CODE} AND ct.code IN ('INCOME', 'EXPENSE')
      GROUP BY l.account_id, a.normal_balance
      HAVING COALESCE(SUM(
        CASE WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
             ELSE l.debit_amount - l.credit_amount END
      ), 0) <> 0
    `;
  }

  async close(tenantId: string | null, dto: CreatePeriodClosingDto, user: RequestUser) {
    if (!tenantId) throw new BadRequestException('Selecciona un tenant activo.');

    const institution = await this.assertInstitutionAccessible(dto.institutionId, tenantId, user);
    if (dto.branchId) {
      await this.assertBranchBelongsToInstitution(dto.branchId, dto.institutionId);
    }
    if (!user.isSuperadmin) {
      const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId: dto.institutionId });
      if (!branchScope.unrestricted && (!dto.branchId || !branchScope.branchIds.includes(dto.branchId))) {
        throw new ForbiddenException('No tienes alcance para cerrar un periodo fuera de tu sucursal.');
      }
    }
    const targetAccount = await this.getEquityAccount(dto.targetEquityAccountId, institution.tenantId);

    const closedThroughDate = new Date(dto.closedThroughDate);

    const lastClosing = await this.prisma.periodClosing.findFirst({
      where: { institutionId: dto.institutionId, branchId: dto.branchId ?? null, reopenedAt: null },
      orderBy: { closedThroughDate: 'desc' },
    });
    if (lastClosing && closedThroughDate <= lastClosing.closedThroughDate) {
      throw new BadRequestException(
        `Ya existe un cierre hasta ${lastClosing.closedThroughDate.toISOString().slice(0, 10)}. El nuevo cierre debe ser posterior.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const rows = await this.closingBalances(institution.tenantId, dto.institutionId, dto.branchId, closedThroughDate);

      const lines: LedgerLineInput[] = [];
      let totalIncome = new Prisma.Decimal(0);
      let totalExpense = new Prisma.Decimal(0);

      for (const row of rows) {
        const amount = new Prisma.Decimal(row.total);
        if (row.normal_balance === 'CREDIT') {
          totalIncome = totalIncome.plus(amount);
          if (amount.greaterThan(0)) lines.push({ accountId: row.account_id, debitAmount: amount });
          else lines.push({ accountId: row.account_id, creditAmount: amount.negated() });
        } else {
          totalExpense = totalExpense.plus(amount);
          if (amount.greaterThan(0)) lines.push({ accountId: row.account_id, creditAmount: amount });
          else lines.push({ accountId: row.account_id, debitAmount: amount.negated() });
        }
      }

      const netResult = totalIncome.minus(totalExpense);
      if (!netResult.isZero()) {
        if (netResult.greaterThan(0)) {
          lines.push({ accountId: targetAccount.id, creditAmount: netResult });
        } else {
          lines.push({ accountId: targetAccount.id, debitAmount: netResult.negated() });
        }
      }

      let closingEntryId: string | null = null;
      if (lines.length > 0) {
        const entry = await this.ledger.postEntry(tx, {
          tenantId: institution.tenantId,
          institutionId: dto.institutionId,
          branchId: dto.branchId ?? null,
          entryDate: closedThroughDate,
          description: 'Cierre de periodo',
          sourceType: 'period_closing',
          createdBy: user.userId,
          lines,
        });
        closingEntryId = entry.id;
      }

      const closing = await tx.periodClosing.create({
        data: {
          tenantId: institution.tenantId,
          institutionId: dto.institutionId,
          branchId: dto.branchId,
          closedThroughDate,
          closingEntryId,
          targetEquityAccountId: targetAccount.id,
          notes: dto.notes,
          closedBy: user.userId,
        },
        include,
      });

      return closing;
    });
  }

  async reopen(id: string, tenantId: string | null, dto: ReopenPeriodClosingDto, user: RequestUser) {
    if (!user.isSuperadmin) {
      throw new ForbiddenException('Solo un superadministrador puede reabrir un periodo cerrado.');
    }

    const closing = await this.prisma.periodClosing.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!closing) throw new NotFoundException(`Cierre "${id}" no encontrado`);
    if (closing.reopenedAt) {
      throw new BadRequestException('Este cierre ya está reabierto.');
    }

    return this.prisma.periodClosing.update({
      where: { id },
      data: { reopenedAt: new Date(), reopenedBy: user.userId, reopenReason: dto.reason },
      include,
    });
  }
}
