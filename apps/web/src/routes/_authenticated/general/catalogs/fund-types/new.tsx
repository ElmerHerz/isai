import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { FundTypeForm } from '@/modules/membresia/fund-types/components/fund-type-form';

export interface FundTypeNewSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/fund-types/new')({
  validateSearch: (search: Record<string, unknown>): FundTypeNewSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: NewFundTypePage,
});

function NewFundTypePage() {
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

      <FundTypeForm tenantId={tenantId} onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
