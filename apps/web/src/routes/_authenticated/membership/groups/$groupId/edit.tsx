import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useGroupQuery } from '@/modules/membresia';
import { GroupForm } from '@/modules/membresia/groups/components/group-form';

export const Route = createFileRoute('/_authenticated/membership/groups/$groupId/edit')({
  component: EditGroupPage,
});

function EditGroupPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const { data: group } = useGroupQuery(groupId);

  return (
    <div>
      <Link
        to="/membership/groups/$groupId"
        params={{ groupId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Grupo
      </Link>

      {group && (
        <GroupForm
          institutionId={group.institutionId}
          group={group}
          onSaved={() => navigate({ to: '/membership/groups/$groupId', params: { groupId } })}
        />
      )}
    </div>
  );
}
