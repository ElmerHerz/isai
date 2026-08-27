import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Building2, Landmark, LayoutGrid, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { useMeQuery } from '@/modules/security';
import { useTenantsQuery, useInstitutionsQuery, useMyMenuQuery } from '@/modules/general';
import { useGroupsQuery, usePersonsQuery } from '@/modules/membresia';
import { useGroupFundsSummaryQuery } from '@/modules/finanzas';
import { useProjectsQuery } from '@/modules/proyectos';
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
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  gradient: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
      <Card className="rounded-2xl border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
        <Wrapper
          {...(onClick ? { type: 'button', onClick } : {})}
          className="block w-full text-left"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ background: gradient }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
              {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{hint}</p>}
            </div>
          </CardContent>
        </Wrapper>
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

function formatAmount(amount: string) {
  return `$${Number(amount).toFixed(2)}`;
}

function HomePage() {
  const { data: user } = useMeQuery();
  const navigate = useNavigate();
  const isSuperadmin = !!user && !user.tenantId;
  const permissions = user?.permissions ?? [];

  // GET /tenants pide core.tenant.view — hoy solo superadmin lo tiene (ver
  // use-tenants.query.ts). Un usuario de tenant tampoco necesita saber
  // cuántos tenants hay en toda la plataforma.
  const tenantsQuery = useTenantsQuery(isSuperadmin);
  // GET /institutions ya no exige un permiso de negocio (ver sesión: el
  // propio servicio filtra por el alcance real del usuario) — cualquier
  // usuario autenticado puede pedirlo sin riesgo de 403.
  const institutionsQuery = useInstitutionsQuery();
  const { data: menu } = useMyMenuQuery();
  const quickLinks = menu ? flattenLeaves(menu) : [];

  // Las tarjetas de "esta institución" (Grupos/Fondos/Proyectos/Personas)
  // solo tienen sentido para un usuario de tenant operando dentro de una
  // institución concreta — un superadmin sin tenant elegido vería acá una
  // institución cualquiera de toda la plataforma, no es información útil
  // para él. Se ancla a la primera institución accesible, mismo criterio
  // que Grupos/Proyectos/etc. al elegir automáticamente.
  const [institutionId, setInstitutionId] = useState('');
  useEffect(() => {
    if (!isSuperadmin && !institutionId && institutionsQuery.data?.length) {
      setInstitutionId(institutionsQuery.data[0]!.id);
    }
  }, [isSuperadmin, institutionId, institutionsQuery.data]);

  const canViewGroups = permissions.includes('membership.group.view');
  const canViewGroupFunds = permissions.includes('finance.group_fund.view');
  const canViewProjects = permissions.includes('finance.project.view');
  const canViewPersons = permissions.includes('membership.person.view');

  const groupsQuery = useGroupsQuery(!isSuperadmin && canViewGroups ? institutionId : '');
  const groupFundsQuery = useGroupFundsSummaryQuery(!isSuperadmin && canViewGroupFunds ? institutionId : '');
  const projectsQuery = useProjectsQuery(!isSuperadmin && canViewProjects ? institutionId : '');
  const personsQuery = usePersonsQuery(!isSuperadmin && canViewPersons ? institutionId : '');

  const activeProjects = projectsQuery.data?.filter((p) => p.status === 'active').length;
  const totalGroupFunds = groupFundsQuery.data?.reduce((sum, g) => sum + Number(g.balance), 0);

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

        {!isSuperadmin && canViewGroups && (
          <StatCard
            icon={LayoutGrid}
            label="Grupos"
            value={groupsQuery.isLoading ? '—' : String(groupsQuery.data?.length ?? 0)}
            hint="Células, sociedades, ministerios..."
            gradient="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
            onClick={() => navigate({ to: '/membership/groups' })}
          />
        )}

        {!isSuperadmin && canViewGroupFunds && (
          <StatCard
            icon={Landmark}
            label="Fondos de Grupo"
            value={groupFundsQuery.isLoading ? '—' : formatAmount(String(totalGroupFunds ?? 0))}
            hint={
              groupFundsQuery.data
                ? `${groupFundsQuery.data.length} grupo${groupFundsQuery.data.length === 1 ? '' : 's'} con alcance`
                : undefined
            }
            gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)"
            onClick={() => navigate({ to: '/finance/group-funds' })}
          />
        )}

        {!isSuperadmin && canViewProjects && (
          <StatCard
            icon={Target}
            label="Proyectos activos"
            value={projectsQuery.isLoading ? '—' : String(activeProjects ?? 0)}
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            onClick={() => navigate({ to: '/finance/projects' })}
          />
        )}

        {!isSuperadmin && canViewPersons && (
          <StatCard
            icon={Users}
            label="Personas"
            value={personsQuery.isLoading ? '—' : String(personsQuery.data?.length ?? 0)}
            gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
            onClick={() => navigate({ to: '/membership/persons' })}
          />
        )}

        <StatCard
          icon={ShieldCheck}
          label="Tu rol"
          value={user?.tenantId ? (user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'Sin rol') : 'Superadmin'}
          hint={user?.tenantId ? undefined : 'Acceso a toda la plataforma'}
          gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
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
