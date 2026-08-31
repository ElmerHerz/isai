import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { RoleForm } from '@/modules/security/roles/components/role-form';

export const Route = createFileRoute('/_authenticated/security/roles/new')({
  component: NewRolePage,
});

function NewRolePage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/security/roles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roles
      </Link>

      <RoleForm onSaved={() => navigate({ to: '/security/roles' })} />
    </div>
  );
}
