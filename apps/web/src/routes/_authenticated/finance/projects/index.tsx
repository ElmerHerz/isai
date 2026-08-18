import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Target, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useProjectsQuery } from '@/modules/finanzas';
import { ProjectFormDialog } from '@/modules/finanzas/projects/components/project-form-dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Project } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/finance/projects/')({
  component: ProjectsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const STATUS_LABELS: Record<Project['status'], string> = {
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

function formatAmount(amount: string) {
  return `$${Number(amount).toFixed(2)}`;
}

function ProgressBar({ project }: { project: Project }) {
  const percent = Math.min(100, (Number(project.totalContributed) / Number(project.goalAmount)) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatAmount(project.totalContributed)}</span>
        <span>{formatAmount(project.goalAmount)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', percent >= 100 ? 'bg-emerald-500' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: projects, isLoading, isError, refetch } = useProjectsQuery(institutionId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        icon={Target}
        title="Proyectos"
        description="Campañas de recaudación con meta y fecha."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proyecto
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {institutions && institutions.length > 1 && (
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas. */}
          <div className="divide-y sm:hidden">
            {isLoading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudieron cargar los proyectos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && projects?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay proyectos.</p>
            )}

            {!isLoading &&
              !isError &&
              projects?.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/finance/projects/$projectId', params: { projectId: project.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[project.status]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {project.branch.name}
                    {project.targetDate ? ` · ${formatDate(project.targetDate)}` : ''}
                  </p>
                  <div className="mt-2">
                    <ProgressBar project={project} />
                  </div>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Proyecto</TableHead>
                  <TableHead style={headStyle}>Sucursal</TableHead>
                  <TableHead style={headStyle}>Avance</TableHead>
                  <TableHead style={headStyle}>Fecha objetivo</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar los proyectos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && projects?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay proyectos.
                    </TableCell>
                  </TableRow>
                )}

                {projects?.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/finance/projects/$projectId', params: { projectId: project.id } })}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.branch.name}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <ProgressBar project={project} />
                    </TableCell>
                    <TableCell>{project.targetDate ? formatDate(project.targetDate) : '—'}</TableCell>
                    <TableCell>{STATUS_LABELS[project.status]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {institutionId && (
        <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />
      )}
    </div>
  );
}
