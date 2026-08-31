import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMilestoneTypesQuery } from '@/modules/membresia';
import { MilestoneTypeForm } from '@/modules/membresia/milestone-types/components/milestone-type-form';

export interface MilestoneTypeEditSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/milestone-types/$typeId')({
  validateSearch: (search: Record<string, unknown>): MilestoneTypeEditSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: EditMilestoneTypePage,
});

function EditMilestoneTypePage() {
  const { typeId } = Route.useParams();
  const { tenantId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: types } = useMilestoneTypesQuery(tenantId);
  const type = types?.find((t) => t.id === typeId);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {type && <MilestoneTypeForm type={type} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
