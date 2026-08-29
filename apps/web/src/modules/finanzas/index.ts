// Módulo Finanzas — Espejo del módulo backend finanzas/
// Recorte 1: catálogo de cuentas (solo lectura, con saldo) + asientos
// contables (solo lectura) + un reporte de totales por sucursal/grupo. La
// acción de "Contabilizar" vive en el módulo de membresía
// (use-post-fund-collection-to-ledger.mutation.ts), no acá — mismo criterio
// que el backend (EventsService), ver plan de sesión.

export { useAccountsQuery, accountsQueryKey } from './accounts/use-accounts.query';
export { useCreateAccountMutation, type CreateAccountInput } from './accounts/use-create-account.mutation';
export { useJournalEntriesQuery, journalEntriesQueryKey } from './journal-entries/use-journal-entries.query';
export { useVoidJournalEntryMutation } from './journal-entries/use-void-journal-entry.mutation';
export { useFundSummaryQuery, fundSummaryQueryKey } from './reports/use-fund-summary.query';
export { useDashboardKpisQuery, dashboardKpisQueryKey } from './reports/use-dashboard-kpis.query';
export { useMonthlyTrendQuery, monthlyTrendQueryKey } from './reports/use-monthly-trend.query';
export { useIncomeStatementQuery, incomeStatementQueryKey } from './reports/use-income-statement.query';
export { useBalanceSheetQuery, balanceSheetQueryKey } from './reports/use-balance-sheet.query';
export { useDonorStatementQuery, donorStatementKey } from './reports/use-donor-statement.query';
export { useRegisterDonorStatementReceiptMutation } from './reports/use-register-donor-statement-receipt.mutation';
export { useDownloadDonorStatementPdf } from './reports/use-download-donor-statement-pdf';
export { useExportEntriesCsv } from './reports/use-export-entries-csv';

export { useBudgetsQuery, budgetsQueryKey } from './budgets/use-budgets.query';
export { useBudgetQuery, budgetDetailKey } from './budgets/use-budget.query';
export { useCreateBudgetMutation, type CreateBudgetInput } from './budgets/use-create-budget.mutation';
export { useUpdateBudgetMutation, type UpdateBudgetInput } from './budgets/use-update-budget.mutation';
export { useAddBudgetLineMutation, type AddBudgetLineInput } from './budgets/use-add-budget-line.mutation';
export { useRemoveBudgetLineMutation } from './budgets/use-remove-budget-line.mutation';
export { useBudgetVsActualQuery, budgetVsActualKey } from './budgets/use-budget-vs-actual.query';

export { useGroupFundsSummaryQuery, groupFundsSummaryKey } from './group-funds/use-group-funds-summary.query';
export { useGroupFundBalanceQuery, groupFundBalanceKey } from './group-funds/use-group-fund-balance.query';
export { useGroupFundMovementsQuery, groupFundMovementsKey } from './group-funds/use-group-fund-movements.query';
export {
  useCreateGroupFundMovementMutation,
  type CreateGroupFundMovementInput,
} from './group-funds/use-create-group-fund-movement.mutation';
export { useApproveGroupFundExpenseMutation } from './group-funds/use-approve-group-fund-expense.mutation';
export { useRejectGroupFundExpenseMutation } from './group-funds/use-reject-group-fund-expense.mutation';
export { usePostGroupFundExpenseToLedgerMutation } from './group-funds/use-post-group-fund-expense-to-ledger.mutation';
export { useRemoveGroupFundExpenseMutation } from './group-funds/use-remove-group-fund-expense.mutation';

export { usePeriodClosingsQuery, periodClosingsQueryKey } from './period-closings/use-period-closings.query';
export { useClosePeriodMutation, type ClosePeriodInput } from './period-closings/use-close-period.mutation';
export { useReopenPeriodClosingMutation } from './period-closings/use-reopen-period-closing.mutation';

export { useMyPendingApprovalsQuery, myPendingApprovalsKey } from './approvals/use-my-pending-approvals.query';
export { useAllPendingApprovalsQuery, allPendingApprovalsKey } from './approvals/use-all-pending-approvals.query';
export {
  useDecidePendingApprovalMutation,
  type DecidePendingApprovalInput,
} from './approvals/use-decide-pending-approval.mutation';
