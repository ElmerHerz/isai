import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { InstitutionTypeForm } from '@/modules/general/catalogs/components/institution-type-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/institution-types/new')({
  component: NewInstitutionTypePage,
});

function NewInstitutionTypePage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      <InstitutionTypeForm onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
