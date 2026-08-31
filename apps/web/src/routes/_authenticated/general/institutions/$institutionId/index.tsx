import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Building2, CheckCircle2, MapPin, MinusCircle, Pencil, Plus } from 'lucide-react';
import {
  useInstitutionQuery,
  useUpdateInstitutionMutation,
  useBranchesQuery,
  useUpdateBranchMutation,
} from '@/modules/general';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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

export const Route = createFileRoute('/_authenticated/general/institutions/$institutionId/')({
  component: InstitutionDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function InstitutionDetailPage() {
  const { institutionId } = Route.useParams();
  const navigate = useNavigate();
  const { data: institution, isLoading, isError, refetch } = useInstitutionQuery(institutionId);
  const branchesQuery = useBranchesQuery(institutionId);
  const updateInstitutionMutation = useUpdateInstitutionMutation();
  const updateBranchMutation = useUpdateBranchMutation(institutionId);
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<{ id: string; name: string } | null>(null);

  const stats = useMemo(() => {
    const list = branchesQuery.data ?? [];
    return {
      total: list.length,
      active: list.filter((b) => b.isActive).length,
      inactive: list.filter((b) => !b.isActive).length,
    };
  }, [branchesQuery.data]);

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
    branchesQuery.data,
    (b) => b.name,
    {
      nombre: (b) => b.name,
      estado: (b) => (b.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (b) => (b.isActive ? 'Activa' : 'Inactiva'),
    },
  );

  if (isError) {
    return <QueryErrorState message="No se pudo cargar la institución." onRetry={() => refetch()} />;
  }

  if (isLoading || !institution) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div>
      <Link
        to="/general/institutions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Instituciones
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={Building2}
          title={institution.name}
          description={institution.typeCode}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="translucent"
                size="sm"
                onClick={() =>
                  updateInstitutionMutation.mutate({
                    id: institution.id,
                    dto: { isActive: !institution.isActive },
                  })
                }
                disabled={updateInstitutionMutation.isPending}
              >
                {institution.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button
                variant="translucent"
                size="sm"
                onClick={() => navigate({ to: '/general/institutions/$institutionId/edit', params: { institutionId } })}
              >
                Editar
              </Button>
            </div>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <StatChip icon={MapPin} label="Sucursales" value={stats.total} />
        <StatChip icon={CheckCircle2} label="Activas" value={stats.active} tone="success" />
        <StatChip icon={MinusCircle} label="Inactivas" value={stats.inactive} tone="warning" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Sucursales</h2>
        <div className="flex items-center gap-2">
          <TableSearch value={search} onChange={setSearch} placeholder="Buscar sucursal..." />
          {!createBranchOpen && (
            <Button
              onClick={() => {
                setEditingBranch(null);
                setCreateBranchOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva sucursal
            </Button>
          )}
        </div>
      </div>

      {createBranchOpen && (
        <div className="mt-4">
          <BranchForm
            institutionId={institutionId}
            onSaved={() => setCreateBranchOpen(false)}
            onCancel={() => setCreateBranchOpen(false)}
          />
        </div>
      )}

      {editingBranch && (
        <div className="mt-4">
          <BranchForm
            institutionId={institutionId}
            branch={editingBranch}
            onSaved={() => setEditingBranch(null)}
            onCancel={() => setEditingBranch(null)}
          />
        </div>
      )}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="nombre" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Nombre
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
                {branchesQuery.isLoading && <TableSkeletonRows columns={3} />}

                {branchesQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <QueryErrorState
                        message="No se pudieron cargar las sucursales."
                        onRetry={() => branchesQuery.refetch()}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {!branchesQuery.isLoading && !branchesQuery.isError && branchesQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Todavía no hay sucursales.
                    </TableCell>
                  </TableRow>
                )}

                {!branchesQuery.isLoading && !branchesQuery.isError && (branchesQuery.data?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={branch.isActive}
                        onCheckedChange={(checked) =>
                          updateBranchMutation.mutate({
                            id: branch.id,
                            dto: { isActive: checked },
                          })
                        }
                        disabled={updateBranchMutation.isPending}
                        aria-label={branch.isActive ? 'Desactivar sucursal' : 'Activar sucursal'}
                        title={branch.isActive ? 'Desactivar' : 'Activar'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => {
                            setCreateBranchOpen(false);
                            setEditingBranch({ id: branch.id, name: branch.name });
                          }}
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
