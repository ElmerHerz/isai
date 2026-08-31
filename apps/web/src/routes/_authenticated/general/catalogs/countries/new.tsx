import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { CountryForm } from '@/modules/general/catalogs/components/country-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/countries/new')({
  component: NewCountryPage,
});

function NewCountryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      <CountryForm onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
