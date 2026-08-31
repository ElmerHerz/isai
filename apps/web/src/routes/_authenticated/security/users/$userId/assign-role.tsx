import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useUsersQuery } from '@/modules/security';
import { AssignRoleForm } from '@/modules/security/users/components/assign-role-form';

export const Route = createFileRoute('/_authenticated/security/users/$userId/assign-role')({
  component: AssignRolePage,
});

function AssignRolePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { data: users } = useUsersQuery();
  const user = users?.find((u) => u.id === userId);

  return (
    <div>
      <Link
        to="/security/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Usuarios
      </Link>

      {user && <AssignRoleForm user={user} onSaved={() => navigate({ to: '/security/users' })} />}
    </div>
  );
}
