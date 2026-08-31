import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useProjectQuery } from '@/modules/proyectos';
import { ProjectForm } from '@/modules/proyectos/projects/components/project-form';

export const Route = createFileRoute('/_authenticated/finance/projects/$projectId/edit')({
  component: EditProjectPage,
});

function EditProjectPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: project } = useProjectQuery(projectId);

  return (
    <div>
      <Link
        to="/finance/projects/$projectId"
        params={{ projectId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Proyecto
      </Link>

      {project && (
        <ProjectForm
          institutionId={project.institutionId}
          project={project}
          onSaved={() => navigate({ to: '/finance/projects/$projectId', params: { projectId } })}
        />
      )}
    </div>
  );
}
