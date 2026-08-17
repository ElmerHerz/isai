import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Award, Pencil, Plus, XCircle } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { usePositionsQuery, useUpdatePositionMutation } from '@/modules/membresia';
import { PositionFormDialog } from '@/modules/membresia/positions/components/position-form-dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { GroupPositionWithRelations } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/positions')({
  component: PositionsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function isCurrent(position: GroupPositionWithRelations) {
  if (!position.termEnd) return true;
  return new Date(position.termEnd) >= new Date(new Date().toDateString());
}

function PositionsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: positions, isLoading, isError, refetch } = usePositionsQuery(institutionId);
  const updateMutation = useUpdatePositionMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<GroupPositionWithRelations | null>(null);
  const [finalizingPosition, setFinalizingPosition] = useState<GroupPositionWithRelations | null>(null);

  const stats = useMemo(() => {
    const list = positions ?? [];
    return { total: list.length, current: list.filter(isCurrent).length };
  }, [positions]);

  const {
    search,
    setSearch,
    sortKey,
    sortDirection,
    toggleSort,
    filters,
    filterOptions,
    toggleFilterValue,
    clearFilter,
    result,
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    paginatedResult,
  } = useSearchAndSort(
    positions,
    (p) => `${p.person.firstName} ${p.person.lastName} ${p.group.name} ${p.position.name}`,
    {
      grupo: (p) => p.group.name,
      persona: (p) => `${p.person.lastName} ${p.person.firstName}`,
      cargo: (p) => p.position.name,
      vigenciaDesde: (p) => p.termStart,
      vigenciaHasta: (p) => p.termEnd ?? '',
      estado: (p) => (isCurrent(p) ? 1 : 0),
    },
    'persona',
    {
      grupo: (p) => p.group.name,
      cargo: (p) => p.position.name,
      estado: (p) => (isCurrent(p) ? 'Vigente' : 'Finalizado'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={Award}
        title="Directivas"
        description="Cargos de directiva (presidente, secretario, tesorero...) dentro de los grupos de la institución."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cargo
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
        <StatChip icon={Award} label="Total" value={stats.total} />
        <StatChip icon={Award} label="Vigentes" value={stats.current} tone="success" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar persona, grupo o cargo..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas en vez de una tabla de 7 columnas. */}
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
                <QueryErrorState message="No se pudieron cargar las directivas." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && positions?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay cargos de directiva asignados.</p>
            )}

            {!isLoading && !isError && (positions?.length ?? 0) > 0 && result.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados para tu búsqueda.</p>
            )}

            {!isLoading &&
              !isError &&
              paginatedResult.map((gp) => {
                const current = isCurrent(gp);
                return (
                  <div key={gp.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {gp.person.firstName} {gp.person.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gp.position.name} · {gp.group.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          current
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {current ? 'Vigente' : 'Finalizado'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatDate(gp.termStart)} — {formatDate(gp.termEnd)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingPosition(gp)}>
                        <Pencil className="mr-1.5 h-4 w-4" />
                        Editar
                      </Button>
                      {current && (
                        <Button
                          variant="delete"
                          size="sm"
                          className="flex-1"
                          onClick={() => setFinalizingPosition(gp)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Escritorio: tabla ordenable/filtrable de siempre. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead
                    sortKey="grupo"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Grupo"
                        options={filterOptions.grupo}
                        selected={filters.grupo}
                        onToggle={(v) => toggleFilterValue('grupo', v)}
                        onClear={() => clearFilter('grupo')}
                      />
                    }
                  >
                    Grupo
                  </SortableTableHead>
                  <SortableTableHead sortKey="persona" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Persona
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="cargo"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Cargo"
                        options={filterOptions.cargo}
                        selected={filters.cargo}
                        onToggle={(v) => toggleFilterValue('cargo', v)}
                        onClear={() => clearFilter('cargo')}
                      />
                    }
                  >
                    Cargo
                  </SortableTableHead>
                  <SortableTableHead sortKey="vigenciaDesde" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Desde
                  </SortableTableHead>
                  <SortableTableHead sortKey="vigenciaHasta" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Hasta
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="estado"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Estado"
                        options={filterOptions.estado}
                        selected={filters.estado}
                        onToggle={(v) => toggleFilterValue('estado', v)}
                        onClear={() => clearFilter('estado')}
                      />
                    }
                  >
                    Estado
                  </SortableTableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={7} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <QueryErrorState message="No se pudieron cargar las directivas." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && positions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Todavía no hay cargos de directiva asignados.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (positions?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((gp) => {
                  const current = isCurrent(gp);
                  return (
                    <TableRow key={gp.id}>
                      <TableCell>{gp.group.name}</TableCell>
                      <TableCell className="font-medium">
                        {gp.person.firstName} {gp.person.lastName}
                      </TableCell>
                      <TableCell>{gp.position.name}</TableCell>
                      <TableCell>{formatDate(gp.termStart)}</TableCell>
                      <TableCell>{formatDate(gp.termEnd)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            current
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                          )}
                        >
                          {current ? 'Vigente' : 'Finalizado'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="edit"
                            size="icon"
                            onClick={() => setEditingPosition(gp)}
                            aria-label="Editar"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {current && (
                            <Button
                              variant="delete"
                              size="icon"
                              onClick={() => setFinalizingPosition(gp)}
                              aria-label="Finalizar cargo"
                              title="Finalizar cargo (hoy)"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={result.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </motion.div>

      {institutionId && (
        <PositionFormDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />
      )}
      {editingPosition && (
        <PositionFormDialog
          open={!!editingPosition}
          onOpenChange={(open) => !open && setEditingPosition(null)}
          institutionId={editingPosition.group.institutionId}
          position={editingPosition}
        />
      )}

      <ConfirmDialog
        open={!!finalizingPosition}
        onOpenChange={(open) => !open && setFinalizingPosition(null)}
        title="Finalizar cargo"
        confirmLabel="Finalizar"
        pendingLabel="Finalizando..."
        description={
          finalizingPosition
            ? `Esto cierra el cargo de ${finalizingPosition.position.name} de ${finalizingPosition.person.firstName} ${finalizingPosition.person.lastName} con fecha de hoy.`
            : ''
        }
        isPending={updateMutation.isPending}
        onConfirm={() => {
          if (!finalizingPosition) return;
          updateMutation.mutate(
            { id: finalizingPosition.id, dto: { termEnd: new Date().toISOString().slice(0, 10) } },
            { onSuccess: () => setFinalizingPosition(null) },
          );
        }}
      />
    </div>
  );
}
