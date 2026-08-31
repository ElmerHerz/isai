import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { ProjectForm } from '@/modules/proyectos/projects/components/project-form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const Route = createFileRoute('/_authenticated/finance/projects/new')({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  return (
    <div>
      <Link
        to="/finance/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Proyectos
      </Link>

      {institutions && institutions.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {institutionId && (
        <ProjectForm
          institutionId={institutionId}
          onSaved={(project) => navigate({ to: '/finance/projects/$projectId', params: { projectId: project.id } })}
        />
      )}
    </div>
  );
}
