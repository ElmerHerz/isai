import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCurrenciesQuery } from '@/modules/general';
import { CurrencyForm } from '@/modules/general/catalogs/components/currency-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/currencies/$code')({
  component: EditCurrencyPage,
});

function EditCurrencyPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: currencies } = useCurrenciesQuery();
  const currency = currencies?.find((c) => c.code === code);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {currency && <CurrencyForm currency={currency} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
