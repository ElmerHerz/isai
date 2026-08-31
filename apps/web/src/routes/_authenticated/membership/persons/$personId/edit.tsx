import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { usePersonQuery } from '@/modules/membresia';
import { PersonForm } from '@/modules/membresia/persons/components/person-form';

export const Route = createFileRoute('/_authenticated/membership/persons/$personId/edit')({
  component: EditPersonPage,
});

function EditPersonPage() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();
  const { data: person } = usePersonQuery(personId);

  return (
    <div>
      <Link
        to="/membership/persons/$personId"
        params={{ personId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Persona
      </Link>

      {person && (
        <PersonForm
          institutionId={person.institutionId}
          person={person}
          onSaved={() => navigate({ to: '/membership/persons/$personId', params: { personId } })}
        />
      )}
    </div>
  );
}
