import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { useChangePasswordMutation } from '@/modules/security';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const Route = createFileRoute('/change-password')({
  beforeLoad: () => {
    // Sin sesión no hay nada que cambiar — manda a login. A diferencia de
    // /login, aquí NO se redirige si ya está autenticado: un usuario con
    // mustChangePassword=true necesita poder volver a esta pantalla.
    if (!useAuthStore.getState().isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: ChangePasswordPage,
});

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Requerido'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmNewPassword: z.string().min(1, 'Requerido'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmNewPassword'],
  });

type FormValues = z.infer<typeof schema>;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function ChangePasswordPage() {
  const navigate = useNavigate();
  const mutation = useChangePasswordMutation();
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => navigate({ to: '/' }) },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-background">
      <div className="w-full max-w-sm">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <Card className="rounded-3xl border-slate-200/80 shadow-xl shadow-slate-200/50 dark:border-border dark:shadow-none">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Debes cambiar tu contraseña</CardTitle>
              <CardDescription>Es tu primer ingreso (o un admin te la restableció) — define una contraseña nueva para continuar.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="h-12 rounded-full pl-11 pr-11"
                      {...register('currentPassword')}
                    />
                  </div>
                  {errors.currentPassword && <p className="pl-1 text-sm text-destructive">{errors.currentPassword.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Contraseña nueva</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-12 rounded-full pl-11 pr-11"
                      {...register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="pl-1 text-sm text-destructive">{errors.newPassword.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirmar contraseña nueva</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmNewPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-12 rounded-full pl-11"
                      {...register('confirmNewPassword')}
                    />
                  </div>
                  {errors.confirmNewPassword && <p className="pl-1 text-sm text-destructive">{errors.confirmNewPassword.message}</p>}
                </div>

                <AnimatePresence>
                  {mutation.isError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-destructive"
                    >
                      {getErrorMessage(mutation.error, 'No se pudo cambiar la contraseña.')}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div variants={fadeUp} initial="hidden" animate="show">
                  <Button
                    type="submit"
                    className="group h-12 w-full rounded-full text-base shadow-lg shadow-primary/25"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      'Guardando...'
                    ) : (
                      <>
                        Cambiar contraseña
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
