import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { UserForm } from '@/modules/security/users/components/user-form';

export const Route = createFileRoute('/_authenticated/security/users/new')({
  component: NewUserPage,
});

function NewUserPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/security/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Usuarios
      </Link>

      <UserForm onSaved={() => navigate({ to: '/security/users' })} />
    </div>
  );
}
