import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { usePositionsQuery } from '@/modules/membresia';
import { PositionForm } from '@/modules/membresia/positions/components/position-form';

export interface PositionEditSearch {
  institutionId: string;
}

export const Route = createFileRoute('/_authenticated/membership/positions/$positionId')({
  validateSearch: (search: Record<string, unknown>): PositionEditSearch => ({
    institutionId: typeof search.institutionId === 'string' ? search.institutionId : '',
  }),
  component: EditPositionPage,
});

function EditPositionPage() {
  const { positionId } = Route.useParams();
  const { institutionId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: positions } = usePositionsQuery(institutionId);
  const position = positions?.find((p) => p.id === positionId);

  return (
    <div>
      <Link
        to="/membership/positions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Directivas
      </Link>

      {position && (
        <PositionForm
          institutionId={institutionId}
          position={position}
          onSaved={() => navigate({ to: '/membership/positions' })}
        />
      )}
    </div>
  );
}
