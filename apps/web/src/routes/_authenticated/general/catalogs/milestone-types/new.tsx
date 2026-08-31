import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { MilestoneTypeForm } from '@/modules/membresia/milestone-types/components/milestone-type-form';

export interface MilestoneTypeNewSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/milestone-types/new')({
  validateSearch: (search: Record<string, unknown>): MilestoneTypeNewSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: NewMilestoneTypePage,
});

function NewMilestoneTypePage() {
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

      <MilestoneTypeForm tenantId={tenantId} onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
