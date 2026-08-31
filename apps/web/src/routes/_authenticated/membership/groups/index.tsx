import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { LayoutGrid, Pencil, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useGroupsQuery, useUpdateGroupMutation } from '@/modules/membresia';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';

export const Route = createFileRoute('/_authenticated/membership/groups/')({
  component: GroupsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function GroupsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const navigate = useNavigate();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: groups, isLoading, isError, refetch } = useGroupsQuery(institutionId);
  const updateMutation = useUpdateGroupMutation();

  const stats = useMemo(() => {
    const list = groups ?? [];
    return { total: list.length, active: list.filter((g) => g.isActive).length };
  }, [groups]);

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
    groups,
    (g) => g.name,
    {
      grupo: (g) => g.name,
      tipo: (g) => g.groupType.name,
      miembros: (g) => g._count.members,
      estado: (g) => (g.isActive ? 1 : 0),
    },
    'grupo',
    {
      tipo: (g) => g.groupType.name,
      estado: (g) => (g.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={LayoutGrid}
        title="Grupos"
        description="Células, sociedades, ministerios y demás grupos de la institución."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/membership/groups/new' })} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo grupo
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
        <StatChip icon={LayoutGrid} label="Total" value={stats.total} />
        <StatChip icon={LayoutGrid} label="Activos" value={stats.active} tone="success" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar grupo..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas en vez de una tabla de 5 columnas. */}
          <div className="divide-y sm:hidden">
            {isLoading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudieron cargar los grupos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && groups?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay grupos.</p>
            )}

            {!isLoading && !isError && (groups?.length ?? 0) > 0 && result.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados para tu búsqueda.</p>
            )}

            {!isLoading &&
              !isError &&
              paginatedResult.map((group) => (
                <div key={group.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="min-w-0 truncate text-left font-medium text-primary hover:underline"
                      onClick={() => navigate({ to: '/membership/groups/$groupId', params: { groupId: group.id } })}
                    >
                      {group.name}
                    </button>
                    <Switch
                      checked={group.isActive}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: group.id, dto: { isActive: checked } })}
                      disabled={updateMutation.isPending}
                      aria-label={group.isActive ? 'Desactivar grupo' : 'Activar grupo'}
                      title={group.isActive ? 'Desactivar' : 'Activar'}
                      className="shrink-0"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.groupType.name} · {group._count.members} miembro(s)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => navigate({ to: '/membership/groups/$groupId/edit', params: { groupId: group.id } })}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              ))}
          </div>

          {/* Escritorio: tabla ordenable/filtrable de siempre. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="grupo" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Grupo
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
                  <SortableTableHead sortKey="miembros" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Miembros
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
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar los grupos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && groups?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay grupos.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (groups?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      <button
                        className="text-sm text-primary hover:underline"
                        onClick={() =>
                          navigate({ to: '/membership/groups/$groupId', params: { groupId: group.id } })
                        }
                      >
                        {group.name}
                      </button>
                    </TableCell>
                    <TableCell>{group.groupType.name}</TableCell>
                    <TableCell>{group._count.members}</TableCell>
                    <TableCell>
                      <Switch
                        checked={group.isActive}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: group.id, dto: { isActive: checked } })
                        }
                        disabled={updateMutation.isPending}
                        aria-label={group.isActive ? 'Desactivar grupo' : 'Activar grupo'}
                        title={group.isActive ? 'Desactivar' : 'Activar'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => navigate({ to: '/membership/groups/$groupId/edit', params: { groupId: group.id } })}
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
