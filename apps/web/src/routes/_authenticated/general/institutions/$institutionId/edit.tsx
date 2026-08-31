import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useInstitutionQuery } from '@/modules/general';
import { InstitutionForm } from '@/modules/general/institutions/components/institution-form';

export const Route = createFileRoute('/_authenticated/general/institutions/$institutionId/edit')({
  component: EditInstitutionPage,
});

function EditInstitutionPage() {
  const { institutionId } = Route.useParams();
  const navigate = useNavigate();
  const { data: institution } = useInstitutionQuery(institutionId);

  return (
    <div>
      <Link
        to="/general/institutions/$institutionId"
        params={{ institutionId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Institución
      </Link>

      {institution && (
        <InstitutionForm
          institution={{ id: institution.id, name: institution.name, typeCode: institution.typeCode }}
          onSaved={() => navigate({ to: '/general/institutions/$institutionId', params: { institutionId } })}
        />
      )}
    </div>
  );
}
