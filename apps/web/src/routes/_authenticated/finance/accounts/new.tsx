import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { AccountForm } from '@/modules/finanzas/accounts/components/account-form';

export const Route = createFileRoute('/_authenticated/finance/accounts/new')({
  component: NewAccountPage,
});

function NewAccountPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/finance/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogo de Cuentas
      </Link>

      <AccountForm onSaved={() => navigate({ to: '/finance/accounts' })} />
    </div>
  );
}
