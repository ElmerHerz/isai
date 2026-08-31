import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useLanguagesQuery } from '@/modules/general';
import { LanguageForm } from '@/modules/general/catalogs/components/language-form';

export const Route = createFileRoute('/_authenticated/general/catalogs/languages/$code')({
  component: EditLanguagePage,
});

function EditLanguagePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: languages } = useLanguagesQuery();
  const language = languages?.find((l) => l.code === code);

  return (
    <div>
      <Link
        to="/general/catalogs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogos
      </Link>

      {language && <LanguageForm language={language} onSaved={() => navigate({ to: '/general/catalogs' })} />}
    </div>
  );
}
