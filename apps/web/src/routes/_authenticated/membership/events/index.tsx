import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Calendar, ClipboardCheck, Eye, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useEventsQuery } from '@/modules/membresia';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
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
import type { EventWithRelations } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/events/')({
  component: EventsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function scopeLabel(event: EventWithRelations) {
  if (event.group) return event.group.name;
  if (event.branch) return event.branch.name;
  return 'Toda la institución';
}

function EventsPage() {
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

  const { data: events, isLoading, isError, refetch } = useEventsQuery(institutionId);

  const stats = useMemo(() => {
    const list = events ?? [];
    const today = new Date().toDateString();
    return {
      total: list.length,
      upcoming: list.filter((e) => new Date(e.eventDate) >= new Date(today)).length,
    };
  }, [events]);

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
    events,
    (e) => `${e.title} ${e.eventType.name} ${scopeLabel(e)}`,
    {
      titulo: (e) => e.title,
      tipo: (e) => e.eventType.name,
      fecha: (e) => e.eventDate,
      alcance: (e) => scopeLabel(e),
    },
    'fecha',
    {
      tipo: (e) => e.eventType.name,
      alcance: (e) => scopeLabel(e),
    },
  );

  return (
    <div>
      <PageHeader
        icon={Calendar}
        title="Eventos"
        description="Cultos, capacitaciones y demás eventos de la institución."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/membership/events/new' })} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo evento
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
        <StatChip icon={Calendar} label="Total" value={stats.total} />
        <StatChip icon={Calendar} label="Próximos" value={stats.upcoming} tone="success" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar evento..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="titulo" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Título
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
                  <SortableTableHead sortKey="fecha" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Fecha
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="alcance"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Alcance"
                        options={filterOptions.alcance}
                        selected={filters.alcance}
                        onToggle={(v) => toggleFilterValue('alcance', v)}
                        onClear={() => clearFilter('alcance')}
                      />
                    }
                  >
                    Alcance
                  </SortableTableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar los eventos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && events?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay eventos registrados.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (events?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <button
                        className="text-sm text-primary hover:underline"
                        onClick={() =>
                          navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } })
                        }
                      >
                        {event.title}
                      </button>
                    </TableCell>
                    <TableCell>{event.eventType.name}</TableCell>
                    <TableCell>{formatDate(event.eventDate)}</TableCell>
                    <TableCell>{scopeLabel(event)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } })
                          }
                        >
                          <ClipboardCheck className="mr-1.5 h-4 w-4" />
                          Asistencia
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } })
                          }
                          aria-label="Ver"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
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
