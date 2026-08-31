import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ApprovalRouteForm } from '@/modules/proyectos/approval-routes/components/approval-route-form';

export const Route = createFileRoute('/_authenticated/finance/approval-routes/new')({
  component: NewApprovalRoutePage,
});

function NewApprovalRoutePage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/finance/approval-routes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Rutas de Aprobación
      </Link>

      <ApprovalRouteForm onSaved={() => navigate({ to: '/finance/approval-routes' })} />
    </div>
  );
}
