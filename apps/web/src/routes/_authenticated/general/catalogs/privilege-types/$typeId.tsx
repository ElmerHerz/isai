import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { usePrivilegeTypesQuery } from '@/modules/membresia';
import { PrivilegeTypeForm } from '@/modules/membresia/privilege-types/components/privilege-type-form';

export interface PrivilegeTypeEditSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/privilege-types/$typeId')({
  validateSearch: (search: Record<string, unknown>): PrivilegeTypeEditSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: EditPrivilegeTypePage,
});

function EditPrivilegeTypePage() {
  const { typeId } = Route.useParams();
  const { tenantId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: types } = usePrivilegeTypesQuery(tenantId);
  const type = types?.find((t) => t.id === typeId);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {type && <PrivilegeTypeForm type={type} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
