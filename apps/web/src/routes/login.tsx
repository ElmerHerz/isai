import { useEffect, useState, type MouseEvent } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useLoginMutation } from '@/modules/security';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    // Ya autenticado → no tiene sentido mostrar el login de nuevo.
    if (useAuthStore.getState().isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const features = [
  { icon: Building2, text: 'Multi-institución: iglesias, tiendas, farmacias y más' },
  { icon: Layers, text: 'Módulos activables según lo que cada cliente necesite' },
  { icon: ShieldCheck, text: 'Roles y permisos con alcance por sucursal' },
];

const MotionButton = motion(Button);

// Cada blob flota lento en un loop infinito (su propio "aliento"),
// y además se mueve como grupo con el mouse (ver BrandPanel).
function Blob({ className, range }: { className: string; range: number }) {
  return (
    <motion.div
      className={className}
      animate={{
        x: [0, range, -range * 0.6, 0],
        y: [0, -range, range * 0.5, 0],
      }}
      transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function BrandPanel() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const parallaxX = useTransform(springX, [-1, 1], [-24, 24]);
  const parallaxY = useTransform(springY, [-1, 1], [-24, 24]);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    mouseY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-10 text-white lg:flex"
    >
      {/* Blobs: siguen al mouse (grupo) y además respiran solos (individual) */}
      <motion.div
        style={{ x: parallaxX, y: parallaxY }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <Blob
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl"
          range={30}
        />
        <Blob
          className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl"
          range={40}
        />
        <Blob
          className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl"
          range={25}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex items-center gap-3"
      >
        <img src="/logo_isai.png" alt="ISAI" className="h-9 w-9 rounded-lg shadow-lg" />
        <span className="text-lg font-semibold tracking-tight">ISAI</span>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative max-w-md"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-sm"
        >
          Plataforma modular multi-institución
        </motion.span>

        <motion.h2
          variants={fadeUp}
          className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight text-balance"
        >
          Integración de Sistemas para la Administración de Instituciones
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base text-white/80">
          Un solo sistema, módulos a la medida de cada institución.
        </motion.p>

        <ul className="mt-10 space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <motion.li key={text} variants={fadeUp} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="pt-1 text-sm text-white/90">{text}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="relative text-sm text-white/50"
      >
        © {new Date().getFullYear()} ISAI. Todos los derechos reservados.
      </motion.p>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // El interceptor de axios redirige acá con ?reason=expired cuando el
  // refresh token ya venció (ver api-client.ts) — un toast disparado justo
  // antes de esa redirección dura completa nunca llega a mostrarse, así que
  // es esta página, ya cargada, la que lo muestra. Se limpia el query param
  // enseguida para que recargar /login no repita el aviso.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'expired') {
      toast.error('Tu sesión expiró. Inicia sesión de nuevo.');
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate({ to: '/' }),
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      {/* Panel del formulario */}
      <div className="flex items-center justify-center bg-slate-50 p-6 dark:bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <img src="/logo_isai.png" alt="ISAI" className="h-10 w-10 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">ISAI</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card className="rounded-3xl border-slate-200/80 shadow-xl shadow-slate-200/50 dark:border-border dark:shadow-none">
              <CardHeader className="space-y-1 pb-2 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">¡Hola de nuevo!</CardTitle>
                <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <motion.form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-4"
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={fadeUp} className="space-y-2">
                    <Label htmlFor="email">Correo</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@empresa.com"
                        className="h-12 rounded-full pl-11"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="pl-1 text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </motion.div>

                  <motion.div variants={fadeUp} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => alert('Próximamente: recuperación de contraseña.')}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="h-12 rounded-full pl-11 pr-11"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={showPassword ? 'eye-off' : 'eye'}
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>
                    {errors.password && (
                      <p className="pl-1 text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </motion.div>

                  <AnimatePresence>
                    {loginMutation.isError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-destructive"
                      >
                        Credenciales inválidas.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.div variants={fadeUp}>
                    <MotionButton
                      type="submit"
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.97 }}
                      className="group h-12 w-full rounded-full text-base shadow-lg shadow-primary/25"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        'Entrando...'
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </MotionButton>
                  </motion.div>
                </motion.form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
