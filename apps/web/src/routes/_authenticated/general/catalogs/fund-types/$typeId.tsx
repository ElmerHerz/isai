import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useFundTypesQuery } from '@/modules/membresia';
import { FundTypeForm } from '@/modules/membresia/fund-types/components/fund-type-form';

export interface FundTypeEditSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/fund-types/$typeId')({
  validateSearch: (search: Record<string, unknown>): FundTypeEditSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: EditFundTypePage,
});

function EditFundTypePage() {
  const { typeId } = Route.useParams();
  const { tenantId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: types } = useFundTypesQuery(tenantId);
  const type = types?.find((t) => t.id === typeId);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {type && <FundTypeForm type={type} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
