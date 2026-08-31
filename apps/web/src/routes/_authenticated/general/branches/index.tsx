import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { MapPin, Building2, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import {
  useAllBranchesQuery,
  useUpdateBranchStatusMutation,
} from '@/modules/general';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { Switch } from '@/components/ui/switch';
import { BranchForm } from '@/modules/general/branches/components/branch-form';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import type { BranchWithInstitution } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/general/branches/')({
  component: BranchesPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function BranchesPage() {
  const { data: branches, isLoading, isError, refetch } = useAllBranchesQuery();
  const updateStatusMutation = useUpdateBranchStatusMutation();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const navigate = useNavigate();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [editingBranch, setEditingBranch] = useState<BranchWithInstitution | null>(null);

  const stats = useMemo(() => {
    const list = branches ?? [];
    return {
      total: list.length,
      active: list.filter((b) => b.isActive).length,
      inactive: list.filter((b) => !b.isActive).length,
    };
  }, [branches]);

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
    branches,
    (b) => `${b.name} ${b.institution.name}`,
    {
      // Mismo orden compuesto que ya usa el backend (institución, luego nombre).
      institucion: (b) => `${b.institution.name} ${b.name}`,
      sucursal: (b) => b.name,
      estado: (b) => (b.isActive ? 1 : 0),
    },
    'institucion',
    {
      institucion: (b) => b.institution.name,
      estado: (b) => (b.isActive ? 'Activa' : 'Inactiva'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={MapPin}
        title="Sucursales/Sedes"
        description="Todas las sucursales de tus instituciones, en un solo lugar."
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatChip icon={MapPin} label="Total" value={stats.total} />
        <StatChip icon={CheckCircle2} label="Activas" value={stats.active} tone="success" />
        <StatChip icon={XCircle} label="Inactivas" value={stats.inactive} tone="warning" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar sucursal o institución..." />
      </div>

      {editingBranch && (
        <div className="mt-4">
          <BranchForm
            institutionId={editingBranch.institutionId}
            branch={{ id: editingBranch.id, name: editingBranch.name }}
            onSaved={() => setEditingBranch(null)}
            onCancel={() => setEditingBranch(null)}
          />
        </div>
      )}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
            <TableHeader className="sticky top-0 z-[1]">
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  sortKey="sucursal"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  style={headStyle}
                >
                  Sucursal
                </SortableTableHead>
                <SortableTableHead
                  sortKey="institucion"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  style={headStyle}
                  filter={
                    <ColumnFilter
                      label="Institución"
                      options={filterOptions.institucion}
                      selected={filters.institucion}
                      onToggle={(v) => toggleFilterValue('institucion', v)}
                      onClear={() => clearFilter('institucion')}
                    />
                  }
                >
                  Institución
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
              {isLoading && <TableSkeletonRows columns={4} />}

              {isError && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <QueryErrorState message="No se pudieron cargar las sucursales." onRetry={() => refetch()} />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && branches?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Todavía no hay sucursales. Se crean desde el detalle de cada institución.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && (branches?.length ?? 0) > 0 && result.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No se encontraron resultados para tu búsqueda.
                  </TableCell>
                </TableRow>
              )}

              {paginatedResult.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() =>
                        navigate({
                          to: '/general/branches/$branchId',
                          params: { branchId: branch.id },
                        })
                      }
                    >
                      {branch.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      onClick={() =>
                        navigate({
                          to: '/general/institutions/$institutionId',
                          params: { institutionId: branch.institution.id },
                        })
                      }
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {branch.institution.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={branch.isActive}
                      onCheckedChange={(checked) =>
                        updateStatusMutation.mutate({
                          institutionId: branch.institutionId,
                          id: branch.id,
                          isActive: checked,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      aria-label={branch.isActive ? 'Desactivar sucursal' : 'Activar sucursal'}
                      title={branch.isActive ? 'Desactivar' : 'Activar'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="edit"
                        size="icon"
                        onClick={() => setEditingBranch(branch)}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
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
            totalItems={result.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </motion.div>

    </div>
  );
}
