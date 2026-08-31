import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEventQuery } from '@/modules/membresia';
import { EventForm } from '@/modules/membresia/events/components/event-form';

export const Route = createFileRoute('/_authenticated/membership/events/$eventId/edit')({
  component: EditEventPage,
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data: event } = useEventQuery(eventId);

  return (
    <div>
      <Link
        to="/membership/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Evento
      </Link>

      {event && (
        <EventForm
          institutionId={event.institutionId}
          event={event}
          onSaved={() => navigate({ to: '/membership/events/$eventId', params: { eventId } })}
        />
      )}
    </div>
  );
}
