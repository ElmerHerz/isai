import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Building2, Landmark, ShieldCheck, Sparkles } from 'lucide-react';
import { useMeQuery } from '@/modules/security';
import { useTenantsQuery, useInstitutionsQuery, useMyMenuQuery } from '@/modules/general';
import { Card, CardContent } from '@/components/ui/card';
import { resolveIcon } from '@/components/layout/icon-map';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import type { MenuNode } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  gradient: string;
}) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
      <Card className="rounded-2xl border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: gradient }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Aplana el árbol de /menus/me a los ítems con ruta real (nunca los headers
// de sección) — son los accesos rápidos que este usuario puede usar hoy,
// sin inventar ni hardcodear nada que no le corresponda por permisos.
function flattenLeaves(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) => (node.route ? [node] : flattenLeaves(node.children)));
}

function QuickLinkCard({ item, index }: { item: MenuNode; index: number }) {
  const Icon = resolveIcon(item.icon);
  const color = item.module.colorHex;
  const isDark = useIsDarkMode();

  return (
    <motion.div variants={fadeUp} custom={index}>
      <Link
        to={item.route as never}
        className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
          style={{ backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    </motion.div>
  );
}

const greetingHour = new Date().getHours();
const greeting = greetingHour < 12 ? 'Buenos días' : greetingHour < 19 ? 'Buenas tardes' : 'Buenas noches';
const today = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

function HomePage() {
  const { data: user } = useMeQuery();
  const isSuperadmin = !!user && !user.tenantId;

  // GET /tenants pide core.tenant.view — hoy solo superadmin lo tiene (ver
  // use-tenants.query.ts). Un usuario de tenant tampoco necesita saber
  // cuántos tenants hay en toda la plataforma.
  const tenantsQuery = useTenantsQuery(isSuperadmin);
  const institutionsQuery = useInstitutionsQuery();
  const { data: menu } = useMyMenuQuery();
  const quickLinks = menu ? flattenLeaves(menu) : [];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white shadow-lg shadow-indigo-600/20 sm:p-10"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize tracking-wide backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {today}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting}, {user?.firstName ?? '...'}
          </h1>
          <p className="mt-2 max-w-lg text-white/80">
            Esto es lo que está pasando en tu plataforma.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {isSuperadmin && (
          <StatCard
            icon={Building2}
            label="Tenants"
            value={tenantsQuery.isLoading ? '—' : String(tenantsQuery.data?.length ?? 0)}
            gradient="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
          />
        )}

        <StatCard
          icon={Landmark}
          label="Instituciones"
          value={institutionsQuery.isLoading ? '—' : String(institutionsQuery.data?.length ?? 0)}
          gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
        />

        <StatCard
          icon={ShieldCheck}
          label="Tu rol"
          value={user?.tenantId ? 'Usuario de tenant' : 'Superadmin'}
          hint={user?.tenantId ? undefined : 'Acceso a toda la plataforma'}
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
        />
      </motion.div>

      {quickLinks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Accesos rápidos
          </h2>
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {quickLinks.map((item, i) => (
              <QuickLinkCard key={item.id} item={item} index={i} />
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
