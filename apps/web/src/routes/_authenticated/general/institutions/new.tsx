import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { InstitutionForm } from '@/modules/general/institutions/components/institution-form';

export const Route = createFileRoute('/_authenticated/general/institutions/new')({
  component: NewInstitutionPage,
});

function NewInstitutionPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/general/institutions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Instituciones
      </Link>

      <InstitutionForm onSaved={() => navigate({ to: '/general/institutions' })} />
    </div>
  );
}
