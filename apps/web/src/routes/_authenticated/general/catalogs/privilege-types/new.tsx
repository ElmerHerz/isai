import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PrivilegeTypeForm } from '@/modules/membresia/privilege-types/components/privilege-type-form';

export interface PrivilegeTypeNewSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/privilege-types/new')({
  validateSearch: (search: Record<string, unknown>): PrivilegeTypeNewSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: NewPrivilegeTypePage,
});

function NewPrivilegeTypePage() {
  const navigate = useNavigate();
  const { tenantId } = Route.useSearch();

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      <PrivilegeTypeForm tenantId={tenantId} onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
