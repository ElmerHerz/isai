import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCatalogItemsQuery } from '@/modules/general';
import { CatalogItemForm } from '@/modules/general/catalogs/components/catalog-item-form';

const SCHEDULE_TYPE_CATALOG_CODE = 'schedule_type';

export const Route = createFileRoute('/_authenticated/general/catalogs/schedule-types/$itemId')({
  component: EditScheduleTypePage,
});

function EditScheduleTypePage() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const { data: items } = useCatalogItemsQuery(SCHEDULE_TYPE_CATALOG_CODE);
  const item = items?.find((i) => i.id === itemId);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {item && (
        <CatalogItemForm
          catalogCode={SCHEDULE_TYPE_CATALOG_CODE}
          item={item}
          onSaved={() => navigate({ to: '/general/catalogs' })}
        />
      )}
    </div>
  );
}
