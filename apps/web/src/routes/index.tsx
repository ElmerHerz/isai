import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';
import { useMeQuery } from '@/modules/security';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const logout = useAuthStore((state) => state.logout);
  const { data: user, isLoading } = useMeQuery();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>ISAI</h1>
      <p>Sistema de Administración Integral — en construcción.</p>

      {!isAuthenticated && <Link to="/login">Iniciar sesión</Link>}

      {isAuthenticated && isLoading && <p>Cargando perfil...</p>}

      {isAuthenticated && user && (
        <div>
          <p>
            Sesión iniciada como <strong>{user.firstName} {user.lastName}</strong> ({user.email})
          </p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
