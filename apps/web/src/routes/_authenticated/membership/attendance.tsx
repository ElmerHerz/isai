import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useInstitutionsQuery, useBranchesQuery, useBranchSchedulesQuery } from '@/modules/general';
import { useEventsQuery, useCreateEventMutation } from '@/modules/membresia';
import { EventFormDialog } from '@/modules/membresia/events/components/event-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
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
import { formatDate, todayLocalDateInput } from '@/lib/format-date';
import { toTimeInputValue } from '@/lib/format-time';
import { cn } from '@/lib/utils';
import type { EventWithRelations } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/attendance')({
  component: AttendancePage,
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

function AttendancePage() {
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
  const { data: branches } = useBranchesQuery(institutionId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [pickedEventId, setPickedEventId] = useState('');
  const [scheduleBranchId, setScheduleBranchId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  const { data: schedules } = useBranchSchedulesQuery(scheduleBranchId);
  const createEventMutation = useCreateEventMutation();

  const stats = useMemo(() => {
    const list = events ?? [];
    return {
      total: list.length,
      taken: list.filter((e) => e._count.attendances > 0).length,
      pending: list.filter((e) => e._count.attendances === 0).length,
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
      estado: (e) => (e._count.attendances > 0 ? 1 : 0),
    },
    'fecha',
    {
      tipo: (e) => e.eventType.name,
      alcance: (e) => scopeLabel(e),
      estado: (e) => (e._count.attendances > 0 ? 'Registrada' : 'Sin registrar'),
    },
  );

  const openPicker = () => {
    setPickedEventId('');
    setScheduleBranchId(branches?.[0]?.id ?? '');
    setScheduleId('');
    setScheduleDate(todayLocalDateInput());
    setPickerOpen(true);
  };

  const onConfirmPicker = () => {
    if (!pickedEventId) return;
    setPickerOpen(false);
    navigate({ to: '/membership/events/$eventId', params: { eventId: pickedEventId } });
  };

  // Crea (o reutiliza, si ya existe) el evento de esta fecha para el
  // horario elegido, y pasa directo a tomar asistencia — así no hay que
  // pasar primero por "Eventos" para cada ocurrencia de un horario
  // recurrente (ej. el culto dominical de cada semana).
  const onCreateFromSchedule = () => {
    const schedule = schedules?.find((s) => s.id === scheduleId);
    if (!schedule || !scheduleDate) return;

    const existing = events?.find(
      (e) => e.scheduleId === schedule.id && e.eventDate.slice(0, 10) === scheduleDate,
    );
    if (existing) {
      setPickerOpen(false);
      navigate({ to: '/membership/events/$eventId', params: { eventId: existing.id } });
      return;
    }

    createEventMutation.mutate(
      {
        institutionId,
        branchId: schedule.groupId ? undefined : schedule.branchId,
        groupId: schedule.groupId ?? undefined,
        scheduleId: schedule.id,
        eventTypeId: schedule.scheduleTypeId,
        title: schedule.label || schedule.scheduleType.name,
        eventDate: scheduleDate,
        startTime: toTimeInputValue(schedule.startTime) || undefined,
        endTime: toTimeInputValue(schedule.endTime) || undefined,
      },
      {
        onSuccess: (event) => {
          setPickerOpen(false);
          navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } });
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Asistencia"
        description="Registra quién asistió a cada evento de la institución."
        action={
          <Button variant="translucent" onClick={openPicker} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva asistencia
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
        <StatChip icon={ClipboardCheck} label="Eventos" value={stats.total} />
        <StatChip icon={ClipboardCheck} label="Con asistencia" value={stats.taken} tone="success" />
        <StatChip icon={ClipboardCheck} label="Sin registrar" value={stats.pending} tone="warning" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar evento..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas — una tabla de 6 columnas nunca cabe
              bien en una pantalla angosta, y agregarle scroll horizontal es
              incómodo con el pulgar. Esta lista es la puerta de entrada
              principal del módulo, vale la pena el layout aparte. */}
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
                <QueryErrorState message="No se pudieron cargar los eventos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && events?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Todavía no hay eventos — usa "Nueva asistencia" para crear el primero.
              </p>
            )}

            {!isLoading && !isError && (events?.length ?? 0) > 0 && result.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron resultados para tu búsqueda.</p>
            )}

            {!isLoading &&
              !isError &&
              paginatedResult.map((event) => {
                const taken = event._count.attendances > 0;
                return (
                  <div key={event.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.eventType.name} · {formatDate(event.eventDate)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          taken
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {taken ? `${event._count.attendances} registrada(s)` : 'Sin registrar'}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">{scopeLabel(event)}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } })}
                    >
                      <ClipboardCheck className="mr-1.5 h-4 w-4" />
                      {taken ? 'Editar' : 'Tomar'}
                    </Button>
                  </div>
                );
              })}
          </div>

          {/* Escritorio: tabla ordenable/filtrable de siempre. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="titulo" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Evento
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
                  <SortableTableHead
                    sortKey="estado"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Asistencia"
                        options={filterOptions.estado}
                        selected={filters.estado}
                        onToggle={(v) => toggleFilterValue('estado', v)}
                        onClear={() => clearFilter('estado')}
                      />
                    }
                  >
                    Asistencia
                  </SortableTableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={6} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <QueryErrorState message="No se pudieron cargar los eventos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && events?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Todavía no hay eventos — usa "Nueva asistencia" para crear el primero.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (events?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((event) => {
                  const taken = event._count.attendances > 0;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.eventType.name}</TableCell>
                      <TableCell>{formatDate(event.eventDate)}</TableCell>
                      <TableCell>{scopeLabel(event)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            taken
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                          )}
                        >
                          {taken ? `${event._count.attendances} registrada(s)` : 'Sin registrar'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate({ to: '/membership/events/$eventId', params: { eventId: event.id } })
                            }
                          >
                            <ClipboardCheck className="mr-1.5 h-4 w-4" />
                            {taken ? 'Editar' : 'Tomar'}
                          </Button>
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva asistencia</DialogTitle>
            <DialogDescription>
              Elige un horario ya programado en una sucursal (lo más común), o un evento que ya hayas creado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Desde un horario programado</p>

              {branches && branches.length > 1 && (
                <Select
                  value={scheduleBranchId}
                  onValueChange={(value) => {
                    setScheduleBranchId(value);
                    setScheduleId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={scheduleId} onValueChange={setScheduleId} disabled={!scheduleBranchId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !scheduleBranchId
                        ? 'Elige una sucursal primero'
                        : schedules?.length
                          ? 'Selecciona un horario'
                          : 'Esta sucursal no tiene horarios programados'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {schedules?.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.label || schedule.scheduleType.name} · {toTimeInputValue(schedule.startTime)}
                      {schedule.endTime ? `–${toTimeInputValue(schedule.endTime)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <Label htmlFor="schedule-date" className="text-xs">Fecha</Label>
                <DateInput id="schedule-date" value={scheduleDate} onChange={setScheduleDate} />
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={onCreateFromSchedule}
                disabled={!scheduleId || !scheduleDate || createEventMutation.isPending}
              >
                {createEventMutation.isPending ? 'Creando...' : 'Continuar'}
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              o
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Evento existente</p>
              <Select value={pickedEventId} onValueChange={setPickedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} · {formatDate(event.eventDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" className="w-full" onClick={onConfirmPicker} disabled={!pickedEventId}>
                Continuar
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              o
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Evento nuevo (manual)</p>
              <p className="text-xs text-muted-foreground">
                Para un evento suelto que no está atado a ningún horario programado (ej. una convención).
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPickerOpen(false);
                  setManualCreateOpen(true);
                }}
              >
                Crear evento manual
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {institutionId && (
        <EventFormDialog open={manualCreateOpen} onOpenChange={setManualCreateOpen} institutionId={institutionId} />
      )}
    </div>
  );
}
