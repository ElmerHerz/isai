import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCountriesQuery } from '@/modules/general';
import { CountryForm } from '@/modules/general/catalogs/components/country-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/countries/$code')({
  component: EditCountryPage,
});

function EditCountryPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: countries } = useCountriesQuery();
  const country = countries?.find((c) => c.code === code);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {country && <CountryForm country={country} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
