// Módulo Proyectos — campañas de recaudación con meta y fecha (aportes,
// gastos, "Contabilizar"). Separado de Finanzas como módulo propio (con su
// propio schema de Postgres "proyectos") — ver
// docs/finanzas-mejoras-propuestas.md §6. Sigue consumiendo cuentas del
// catálogo de Finanzas (@/modules/finanzas) para elegir a qué contabilizar.

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
