import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { CatalogItemForm } from '@/modules/general/catalogs/components/catalog-item-form';

const SCHEDULE_TYPE_CATALOG_CODE = 'schedule_type';

export const Route = createFileRoute('/_authenticated/general/catalogs/schedule-types/new')({
  component: NewScheduleTypePage,
});

function NewScheduleTypePage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      <CatalogItemForm
        catalogCode={SCHEDULE_TYPE_CATALOG_CODE}
        onSaved={() => navigate({ to: '/general/catalogs' })}
      />
    </div>
  );
}
