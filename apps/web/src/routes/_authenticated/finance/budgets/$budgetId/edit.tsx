import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useBudgetQuery } from '@/modules/finanzas';
import { BudgetForm } from '@/modules/finanzas/budgets/components/budget-form';

export const Route = createFileRoute('/_authenticated/finance/budgets/$budgetId/edit')({
  component: EditBudgetPage,
});

function EditBudgetPage() {
  const { budgetId } = Route.useParams();
  const navigate = useNavigate();
  const { data: budget } = useBudgetQuery(budgetId);

  return (
    <div>
      <Link
        to="/finance/budgets/$budgetId"
        params={{ budgetId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Presupuesto
      </Link>

      {budget && (
        <BudgetForm
          institutionId={budget.institutionId}
          budget={budget}
          onSaved={() => navigate({ to: '/finance/budgets/$budgetId', params: { budgetId } })}
        />
      )}
    </div>
  );
}
