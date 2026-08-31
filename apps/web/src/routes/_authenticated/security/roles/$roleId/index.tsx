import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useRolesQuery } from '@/modules/security';
import { RoleForm } from '@/modules/security/roles/components/role-form';

export const Route = createFileRoute('/_authenticated/security/roles/$roleId/')({
  component: EditRolePage,
});

function EditRolePage() {
  const { roleId } = Route.useParams();
  const navigate = useNavigate();
  const { data: roles } = useRolesQuery();
  const role = roles?.find((r) => r.id === roleId);

  return (
    <div>
      <Link
        to="/security/roles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roles
      </Link>

      {role && <RoleForm role={role} onSaved={() => navigate({ to: '/security/roles' })} />}
    </div>
  );
}
