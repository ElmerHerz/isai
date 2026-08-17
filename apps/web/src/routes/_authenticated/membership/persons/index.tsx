import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Users, Plus, Upload, Pencil, Eye } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { usePersonsQuery, useUpdatePersonMutation } from '@/modules/membresia';
import { PersonFormDialog } from '@/modules/membresia/persons/components/person-form-dialog';
import { ImportPersonsDialog } from '@/modules/membresia/persons/components/import-persons-dialog';
import { PersonDetailDialog } from '@/modules/membresia/persons/components/person-detail-dialog';
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
import type { PersonWithRelations } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/persons/')({
  component: PersonsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function PersonsPage() {
  const navigate = useNavigate();
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

  const { data: persons, isLoading, isError, refetch } = usePersonsQuery(institutionId);
  const updateMutation = useUpdatePersonMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithRelations | null>(null);
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = persons ?? [];
    return { total: list.length, active: list.filter((p) => p.isActive).length };
  }, [persons]);

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
    persons,
    (p) => `${p.firstName} ${p.lastName}`,
    {
      nombre: (p) => `${p.lastName} ${p.firstName}`,
      tipo: (p) => p.personType.name,
      sucursal: (p) => p.branch?.name ?? '',
      estado: (p) => (p.isActive ? 1 : 0),
    },
    'nombre',
    {
      tipo: (p) => p.personType.name,
      sucursal: (p) => p.branch?.name ?? 'Toda la institución',
      estado: (p) => (p.isActive ? 'Activa' : 'Inactiva'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Personas"
        description="Miembros, visitantes, empleados y demás personas de la institución."
        action={
          <div className="flex gap-2">
            <Button variant="translucent" onClick={() => setImportOpen(true)} disabled={!institutionId}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button variant="translucent" onClick={() => setCreateOpen(true)} disabled={!institutionId}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva persona
            </Button>
          </div>
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
        <StatChip icon={Users} label="Total" value={stats.total} />
        <StatChip icon={Users} label="Activas" value={stats.active} tone="success" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar persona..." />
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
                <QueryErrorState message="No se pudieron cargar las personas." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && persons?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay personas registradas.</p>
            )}

            {!isLoading && !isError && (persons?.length ?? 0) > 0 && result.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados para tu búsqueda.</p>
            )}

            {!isLoading &&
              !isError &&
              paginatedResult.map((person) => (
                <button
                  key={person.id}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => navigate({ to: '/membership/persons/$personId', params: { personId: person.id } })}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {person.personType.name} · {person.branch?.name ?? 'Toda la institución'}
                      {!person.isActive && ' · Inactiva'}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
          </div>

          {/* Escritorio: tabla ordenable/filtrable de siempre. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
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
                  <SortableTableHead
                    sortKey="sucursal"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Sucursal"
                        options={filterOptions.sucursal}
                        selected={filters.sucursal}
                        onToggle={(v) => toggleFilterValue('sucursal', v)}
                        onClear={() => clearFilter('sucursal')}
                      />
                    }
                  >
                    Sucursal
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
                      <QueryErrorState message="No se pudieron cargar las personas." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && persons?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay personas registradas.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (persons?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                      {person.firstName} {person.lastName}
                    </TableCell>
                    <TableCell>{person.personType.name}</TableCell>
                    <TableCell>{person.branch?.name ?? 'Toda la institución'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={person.isActive}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: person.id, dto: { isActive: checked } })
                        }
                        disabled={updateMutation.isPending}
                        aria-label={person.isActive ? 'Desactivar persona' : 'Activar persona'}
                        title={person.isActive ? 'Desactivar' : 'Activar'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingPersonId(person.id)}
                          aria-label="Ver"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => setEditingPerson(person)}
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

      {institutionId && (
        <PersonFormDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />
      )}
      {institutionId && (
        <ImportPersonsDialog open={importOpen} onOpenChange={setImportOpen} institutionId={institutionId} />
      )}
      {editingPerson && (
        <PersonFormDialog
          open={!!editingPerson}
          onOpenChange={(open) => !open && setEditingPerson(null)}
          institutionId={editingPerson.institutionId}
          person={editingPerson}
        />
      )}
      {viewingPersonId && (
        <PersonDetailDialog
          open={!!viewingPersonId}
          onOpenChange={(open) => !open && setViewingPersonId(null)}
          personId={viewingPersonId}
        />
      )}
    </div>
  );
}
