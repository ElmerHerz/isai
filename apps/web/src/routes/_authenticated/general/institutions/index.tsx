import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Building2, CheckCircle2, Landmark, MinusCircle, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { InstitutionFormDialog } from '@/modules/general/institutions/components/institution-form-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/general/institutions/')({
  component: InstitutionsListPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function InstitutionsListPage() {
  const { data: institutions, isLoading, isError, refetch } = useInstitutionsQuery();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const stats = useMemo(() => {
    const list = institutions ?? [];
    return {
      total: list.length,
      active: list.filter((i) => i.isActive).length,
      inactive: list.filter((i) => !i.isActive).length,
      branches: list.reduce((sum, i) => sum + i.branchCount, 0),
    };
  }, [institutions]);

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
    institutions,
    (i) => `${i.name} ${i.typeCode}`,
    {
      nombre: (i) => i.name,
      tipo: (i) => i.typeCode,
      sucursales: (i) => i.branchCount,
      estado: (i) => (i.isActive ? 1 : 0),
    },
    'nombre',
    {
      tipo: (i) => i.typeCode,
      estado: (i) => (i.isActive ? 'Activa' : 'Inactiva'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Instituciones"
        description="Las instituciones que administras."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva institución
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatChip icon={Building2} label="Total" value={stats.total} />
        <StatChip icon={CheckCircle2} label="Activas" value={stats.active} tone="success" />
        <StatChip icon={MinusCircle} label="Inactivas" value={stats.inactive} tone="warning" />
        <StatChip icon={Landmark} label="Sucursales" value={stats.branches} tone="accent" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar institución..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-px" style={headStyle} />
                  <SortableTableHead sortKey="nombre" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Nombre
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="tipo"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Tipo"
                        options={filterOptions.tipo}
                        selected={filters.tipo}
                        onToggle={(v) => toggleFilterValue('tipo', v)}
                        onClear={() => clearFilter('tipo')}
                      />
                    }
                  >
                    Tipo
                  </SortableTableHead>
                  <SortableTableHead sortKey="sucursales" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Sucursales
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar las instituciones." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && institutions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay instituciones.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (institutions?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((institution) => (
                  <TableRow
                    key={institution.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/general/institutions/$institutionId',
                        params: { institutionId: institution.id },
                      })
                    }
                  >
                    <TableCell>
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark, 10) }}
                      >
                        <Building2 className="h-4 w-4" />
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{institution.name}</TableCell>
                    <TableCell className="capitalize">{institution.typeCode}</TableCell>
                    <TableCell>{institution.branchCount}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          institution.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {institution.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
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

      <InstitutionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
