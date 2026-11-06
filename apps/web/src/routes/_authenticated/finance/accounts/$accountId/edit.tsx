import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useAccountsQuery } from '@/modules/finanzas';
import { AccountForm } from '@/modules/finanzas/accounts/components/account-form';

export const Route = createFileRoute('/_authenticated/finance/accounts/$accountId/edit')({
  component: EditAccountPage,
});

function EditAccountPage() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  // No hay GET /accounts/:id — reusa el listado ya cacheado (pocas cuentas
  // por tenant, mismo patrón que accountDepth en la lista usa un Map local).
  const { data: accounts, isLoading } = useAccountsQuery();
  const account = accounts?.find((a) => a.id === accountId);

  return (
    <div>
      <Link
        to="/finance/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogo de Cuentas
      </Link>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>}
      {!isLoading && !account && <p className="mt-4 text-sm text-destructive">Cuenta no encontrada.</p>}
      {account && <AccountForm account={account} onSaved={() => navigate({ to: '/finance/accounts' })} />}
    </div>
  );
}
