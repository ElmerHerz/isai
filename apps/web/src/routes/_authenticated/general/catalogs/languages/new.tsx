import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { LanguageForm } from '@/modules/general/catalogs/components/language-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/languages/new')({
  component: NewLanguagePage,
});

function NewLanguagePage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      <LanguageForm onSaved={() => navigate({ to: '/general/catalogs' })} />
    </div>
  );
}
