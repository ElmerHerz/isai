import { useState } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ChevronRight, Home, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useMeQuery, useLogoutMutation } from '@/modules/security';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { useCurrentMenuNode } from '@/components/layout/use-current-menu-node';
import { darken, lighten } from '@/lib/color';
import { useThemeStore } from '@/lib/theme-store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    // Sin sesión → nada que hacer aquí, manda a login.
    if (!useAuthStore.getState().isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function initials(firstName?: string, lastName?: string) {
  if (!firstName || !lastName) return '··';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function AuthenticatedLayout() {
  const { data: user } = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { sectionLabel, itemLabel, colorHex } = useCurrentMenuNode();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    // h-screen + overflow-hidden (no min-h-screen): el layout queda fijo al
    // alto de la pantalla, así el <aside> nunca se desplaza — el único que
    // hace scroll es <main>, más abajo.
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-border dark:bg-background/80">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 shrink-0 px-2 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <img src="/logo_isai.png" alt="ISAI" className="h-8 w-8 shrink-0 rounded-lg lg:hidden" />

              {/* Breadcrumb de la sección/página activa — solo en desktop,
                  acentuado con el color del módulo actual. En mobile el
                  logo ya ocupa ese espacio. */}
              <motion.div
                key={itemLabel ?? 'home'}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden min-w-0 items-center gap-2 lg:flex"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorHex }}
                />
                {sectionLabel && (
                  <>
                    <span className="truncate text-sm text-muted-foreground">{sectionLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </>
                )}
                <span className="truncate text-sm font-semibold tracking-tight">
                  {itemLabel ?? 'Inicio'}
                </span>
              </motion.div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {user && (
                <div className="hidden items-center gap-2.5 sm:flex">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: colorHex }}
                  >
                    {initials(user.firstName, user.lastName)}
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {!user.tenantId
                        ? 'Superadmin'
                        : user.roles && user.roles.length > 0
                          ? user.roles.join(', ')
                          : 'Sin rol'}
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/' })}
                aria-label="Inicio"
                title="Inicio"
                className="px-2 text-muted-foreground"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                className="px-2 text-muted-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-label="Salir"
                title="Salir"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {logoutMutation.isPending ? 'Saliendo...' : 'Salir'}
                </span>
              </Button>
            </div>
          </div>

          {/* Acento del módulo actual — misma idea que el degradado de
              PageHeader, pero como una línea fina para no competir con él. */}
          <div
            className="h-[3px] w-full"
            style={{ background: `linear-gradient(90deg, ${lighten(colorHex, 85)} 0%, ${colorHex} 50%, ${darken(colorHex, 10)} 100%)` }}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
