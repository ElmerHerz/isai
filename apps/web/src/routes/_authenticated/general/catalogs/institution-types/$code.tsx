import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useInstitutionTypesQuery } from '@/modules/general';
import { InstitutionTypeForm } from '@/modules/general/catalogs/components/institution-type-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/institution-types/$code')({
  component: EditInstitutionTypePage,
});

function EditInstitutionTypePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: types } = useInstitutionTypesQuery();
  const institutionType = types?.find((t) => t.code === code);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {institutionType && (
        <InstitutionTypeForm institutionType={institutionType} onSaved={() => navigate({ to: '/general/catalogs' })} />
      )}
    </div>
  );
}
