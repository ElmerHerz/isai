import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { AttendanceTagForm } from '@/modules/membresia/attendance-tags/components/attendance-tag-form';

export interface AttendanceTagNewSearch {
  tenantId?: string;
}

export const Route = createFileRoute('/_authenticated/general/catalogs/attendance-tags/new')({
  validateSearch: (search: Record<string, unknown>): AttendanceTagNewSearch => ({
    tenantId: typeof search.tenantId === 'string' ? search.tenantId : undefined,
  }),
  component: NewAttendanceTagPage,
});

function NewAttendanceTagPage() {
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

      <AttendanceTagForm tenantId={tenantId} onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
