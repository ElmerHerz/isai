import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { MenuNode } from '@isai/shared-types';
import { useMyMenuQuery } from '@/modules/general';
import { useUiStore } from '@/lib/ui-store';
import { cn } from '@/lib/utils';
import { resolveIcon } from './icon-map';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);

  return (
    <>
      {/* Desktop: siempre visible desde lg, se puede colapsar a solo íconos */}
      <aside
        className={cn(
          'relative hidden min-h-0 shrink-0 border-r border-slate-200/80 bg-white transition-[width] duration-200 lg:flex lg:flex-col dark:border-border dark:bg-background',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-16 hidden h-6 w-6 items-center justify-center rounded-full border bg-white text-muted-foreground shadow-sm hover:text-foreground lg:flex dark:bg-background"
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Mobile: overlay + panel deslizante, siempre expandido, solo existe mientras está abierto */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onMobileOpenChange(false)}
            />
            <motion.aside
              key="panel"
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-white lg:hidden dark:bg-background"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            >
              <SidebarBrand collapsed={false} />
              <SidebarNav collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-6 py-5', collapsed && 'justify-center px-3')}>
      <img src="/logo_isai.png" alt="ISAI" className="h-8 w-8 shrink-0 rounded-lg" />
      {!collapsed && <span className="font-semibold tracking-tight">ISAI</span>}
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { data: menu, isLoading } = useMyMenuQuery();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  return (
    <motion.nav
      initial="hidden"
      animate="show"
      variants={stagger}
      className={cn('flex-1 space-y-2 overflow-y-auto px-4 pb-6', collapsed && 'px-2')}
    >
      {isLoading && !collapsed && <p className="px-2 text-sm text-muted-foreground">Cargando menú...</p>}

      {menu?.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          currentPath={pathname}
          collapsed={collapsed}
          sectionCollapsed={!collapsed && !!collapsedSections[section.id]}
          onToggle={() =>
            setCollapsedSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
          }
          onNavigate={onNavigate}
        />
      ))}
    </motion.nav>
  );
}

function MenuSection({
  section,
  currentPath,
  collapsed,
  sectionCollapsed,
  onToggle,
  onNavigate,
}: {
  section: MenuNode;
  currentPath: string;
  collapsed: boolean;
  sectionCollapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const SectionIcon = resolveIcon(section.icon);

  return (
    <motion.div variants={fadeIn}>
      <button
        type="button"
        onClick={collapsed ? undefined : onToggle}
        title={collapsed ? section.label : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-accent/50',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: section.module.colorHex }}
        >
          <SectionIcon className="h-3.5 w-3.5" />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                sectionCollapsed && '-rotate-90',
              )}
            />
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {!sectionCollapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-0.5 overflow-hidden pt-1"
          >
            {section.children.map((item) => (
              <MenuLeaf
                key={item.id}
                item={item}
                isActive={currentPath === item.route}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MenuLeaf({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: MenuNode;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const ItemIcon = resolveIcon(item.icon);

  if (!item.route) return null;

  return (
    <li>
      {/* item.route viene del backend como string genérico — las rutas de
          TanStack Router son literales tipadas, no hay forma de tipar esto
          en compilación sin acoplar el sidebar a cada ruta a mano. */}
      <Link
        to={item.route as never}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-slate-100 font-medium text-foreground dark:bg-accent'
            : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground dark:hover:bg-accent/50',
        )}
      >
        <ItemIcon className="h-4 w-4 shrink-0" />
        {!collapsed && item.label}
      </Link>
    </li>
  );
}
