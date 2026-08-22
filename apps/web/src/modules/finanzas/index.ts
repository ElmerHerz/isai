// Módulo Finanzas — Espejo del módulo backend finanzas/
// Recorte 1: catálogo de cuentas (solo lectura, con saldo) + asientos
// contables (solo lectura) + un reporte de totales por sucursal/grupo. La
// acción de "Contabilizar" vive en el módulo de membresía
// (use-post-fund-collection-to-ledger.mutation.ts), no acá — mismo criterio
// que el backend (EventsService), ver plan de sesión.

export { useAccountsQuery, accountsQueryKey } from './accounts/use-accounts.query';
export { useCreateAccountMutation, type CreateAccountInput } from './accounts/use-create-account.mutation';
export { useJournalEntriesQuery, journalEntriesQueryKey } from './journal-entries/use-journal-entries.query';
export { useFundSummaryQuery, fundSummaryQueryKey } from './reports/use-fund-summary.query';
export { useDashboardKpisQuery, dashboardKpisQueryKey } from './reports/use-dashboard-kpis.query';
export { useMonthlyTrendQuery, monthlyTrendQueryKey } from './reports/use-monthly-trend.query';

export { useProjectsQuery, projectsQueryKey } from './projects/use-projects.query';
export { useProjectQuery, projectDetailKey } from './projects/use-project.query';
export { useCreateProjectMutation, type CreateProjectInput } from './projects/use-create-project.mutation';
export { useUpdateProjectMutation, type UpdateProjectInput } from './projects/use-update-project.mutation';
export {
  useProjectContributionsQuery,
  projectContributionsKey,
} from './projects/use-project-contributions.query';
export {
  useCreateProjectContributionMutation,
  type CreateProjectContributionInput,
} from './projects/use-create-project-contribution.mutation';
export { useRemoveProjectContributionMutation } from './projects/use-remove-project-contribution.mutation';
export { usePostProjectContributionToLedgerMutation } from './projects/use-post-project-contribution-to-ledger.mutation';

export { useProjectExpensesQuery, projectExpensesKey } from './projects/use-project-expenses.query';
export {
  useCreateProjectExpenseMutation,
  type CreateProjectExpenseInput,
} from './projects/use-create-project-expense.mutation';
export { useRemoveProjectExpenseMutation } from './projects/use-remove-project-expense.mutation';
export { usePostProjectExpenseToLedgerMutation } from './projects/use-post-project-expense-to-ledger.mutation';

export { useGroupFundsSummaryQuery, groupFundsSummaryKey } from './group-funds/use-group-funds-summary.query';
export { useGroupFundBalanceQuery, groupFundBalanceKey } from './group-funds/use-group-fund-balance.query';
export { useGroupFundMovementsQuery, groupFundMovementsKey } from './group-funds/use-group-fund-movements.query';
export {
  useCreateGroupFundMovementMutation,
  type CreateGroupFundMovementInput,
} from './group-funds/use-create-group-fund-movement.mutation';
