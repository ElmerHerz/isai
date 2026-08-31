import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useAttendanceTagsQuery } from '@/modules/membresia';
import { AttendanceTagForm } from '@/modules/membresia/attendance-tags/components/attendance-tag-form';

export interface AttendanceTagEditSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/attendance-tags/$tagId')({
  validateSearch: (search: Record<string, unknown>): AttendanceTagEditSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: EditAttendanceTagPage,
});

function EditAttendanceTagPage() {
  const { tagId } = Route.useParams();
  const { tenantId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: tags } = useAttendanceTagsQuery(tenantId);
  const tag = tags?.find((t) => t.id === tagId);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {tag && <AttendanceTagForm tag={tag} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
