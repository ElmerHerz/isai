import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoginMutation } from '@/modules/security';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate({ to: '/' }),
    });
  };

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Iniciar sesión</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            {...register('email')}
          />
          {errors.email && <p style={{ color: 'crimson' }}>{errors.email.message}</p>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
            {...register('password')}
          />
          {errors.password && <p style={{ color: 'crimson' }}>{errors.password.message}</p>}
        </div>

        {loginMutation.isError && (
          <p style={{ color: 'crimson' }}>Credenciales inválidas.</p>
        )}

        <button type="submit" disabled={loginMutation.isPending} style={{ padding: '0.5rem 1rem' }}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
