import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { History, FileJson } from 'lucide-react';
import { useAuditLogsQuery, useAuditEntityTypesQuery } from '@/modules/security';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { TableSearch } from '@/components/ui/table-search';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/security/audit')({
  component: AuditPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
};

const ACTION_TONES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditPage() {
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const { data: entityTypes } = useAuditEntityTypesQuery();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<AuditLog | null>(null);

  // Debounce corto para el buscador — a diferencia de las demás tablas
  // (filtran en el cliente sobre una lista ya cargada), acá cada búsqueda es
  // un request nuevo al servidor, no tiene sentido mandar uno por tecla.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, entityType, action]);

  const { data, isLoading, isFetching, isError, refetch } = useAuditLogsQuery({
    page,
    pageSize: PAGE_SIZE,
    entityType: entityType || undefined,
    action: action || undefined,
    search: search || undefined,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        icon={History}
        title="Auditoría"
        description="Quién hizo qué, cuándo y desde dónde — registrado automáticamente en toda la plataforma."
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Select value={entityType || 'all'} onValueChange={(v) => setEntityType(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toda entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda entidad</SelectItem>
            {entityTypes?.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action || 'all'} onValueChange={(v) => setAction(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toda acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda acción</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <TableSearch value={searchInput} onChange={setSearchInput} placeholder="Buscar por usuario..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Fecha</TableHead>
                  <TableHead style={headStyle}>Usuario</TableHead>
                  <TableHead style={headStyle}>Acción</TableHead>
                  <TableHead style={headStyle}>Entidad</TableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || (isFetching && !data)) && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudo cargar la bitácora." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay registros de auditoría todavía.
                    </TableCell>
                  </TableRow>
                )}

                {data?.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>
                      {row.user ? (
                        <>
                          <p className="font-medium">
                            {row.user.firstName} {row.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{row.user.email}</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          ACTION_TONES[row.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {ACTION_LABELS[row.action] ?? row.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.entityType ?? '—'}</span>
                      {row.entityId && (
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                          {row.entityId.slice(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailRow(row)}
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <FileJson className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={data?.total ?? 0}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </motion.div>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del registro</DialogTitle>
            <DialogDescription>
              {detailRow && `${ACTION_LABELS[detailRow.action] ?? detailRow.action} · ${detailRow.entityType ?? '—'} · ${formatDateTime(detailRow.createdAt)}`}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
            {detailRow ? JSON.stringify(detailRow.newValues, null, 2) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
