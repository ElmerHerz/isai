import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useCatalogItemsQuery, useBranchesQuery, useBranchSchedulesQuery } from '@/modules/general';
import { useGroupsQuery, useCreateEventMutation, useUpdateEventMutation } from '@/modules/membresia';
import { toTimeInputValue } from '@/lib/format-time';
import { getErrorMessage } from '@/lib/toast';
import type { EventWithRelations } from '@isai/shared-types';

const EVENT_TYPE_CATALOG_CODE = 'schedule_type';
// Sentinel de UI para el 3er estado del selector de Grupo — el valor vacío
// ('') ya significa "toda la sucursal/institución", así que "personas sin
// ningún grupo" necesita un valor propio que jamás choque con un UUID real.
// Se exporta para que otros selectores de grupo (ej. el de "Nueva
// asistencia" en attendance.tsx) usen el mismo sentinel.
export const UNGROUPED_SENTINEL = '__ungrouped__';

const eventSchema = z.object({
  eventTypeId: z.string().min(1, 'Selecciona un tipo'),
  title: z.string().min(1, 'El título es requerido').max(150),
  eventDate: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  branchId: z.string().optional(),
  scheduleId: z.string().optional(),
  groupId: z.string().optional(),
  notes: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

const EMPTY_VALUES: EventFormValues = {
  eventTypeId: '',
  title: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  branchId: '',
  scheduleId: '',
  groupId: '',
  notes: '',
};

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  event?: EventWithRelations;
}

export function EventFormDialog({ open, onOpenChange, institutionId, event }: EventFormDialogProps) {
  const isEditing = !!event;
  const { data: eventTypes } = useCatalogItemsQuery(EVENT_TYPE_CATALOG_CODE);
  const { data: branches } = useBranchesQuery(institutionId);
  const { data: groups } = useGroupsQuery(institutionId);
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: EMPTY_VALUES,
  });

  const branchId = watch('branchId');
  const { data: schedules } = useBranchSchedulesQuery(branchId || '');

  useEffect(() => {
    if (open) {
      reset(
        event
          ? {
              eventTypeId: event.eventTypeId,
              title: event.title,
              eventDate: event.eventDate.slice(0, 10),
              startTime: toTimeInputValue(event.startTime),
              endTime: toTimeInputValue(event.endTime),
              branchId: event.branchId ?? '',
              scheduleId: event.scheduleId ?? '',
              groupId: event.ungroupedOnly ? UNGROUPED_SENTINEL : event.groupId ?? '',
              notes: event.notes ?? '',
            }
          : EMPTY_VALUES,
      );
    }
  }, [open, event, reset]);

  // Cambiar de sucursal invalida el horario elegido (pertenece a la
  // sucursal anterior) — se limpia para no dejar un scheduleId de una
  // sucursal distinta a la que quedó seleccionada.
  const previousBranchId = event?.branchId ?? '';
  useEffect(() => {
    if (branchId !== previousBranchId) {
      setValue('scheduleId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const onScheduleChange = (scheduleId: string) => {
    setValue('scheduleId', scheduleId);
    const schedule = schedules?.find((s) => s.id === scheduleId);
    if (!schedule) return;

    setValue('eventTypeId', schedule.scheduleTypeId);
    setValue('startTime', toTimeInputValue(schedule.startTime));
    setValue('endTime', toTimeInputValue(schedule.endTime));
    if (schedule.groupId) setValue('groupId', schedule.groupId);
    if (!watch('title') && schedule.label) setValue('title', schedule.label);
  };

  const onSubmit = (values: EventFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const isUngrouped = values.groupId === UNGROUPED_SENTINEL;
    const realGroupId = isUngrouped ? undefined : values.groupId || undefined;
    const dto = {
      ...values,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      scheduleId: values.scheduleId || undefined,
      // groupId (o "sin grupo") con valor manda sobre branchId (ver
      // docs/membresia-diseno.md sección 3) — si el usuario eligió uno de
      // los dos, no tiene sentido mandar también una sucursal.
      branchId: realGroupId || isUngrouped ? undefined : values.branchId || undefined,
      groupId: realGroupId,
      ungroupedOnly: isUngrouped || undefined,
      notes: values.notes || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: event.id, dto }, { onSuccess });
    } else {
      createMutation.mutate({ ...dto, institutionId }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del evento.' : 'Crea un culto, capacitación u otro evento.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" placeholder="Culto Dominical" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal (opcional)</Label>
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Toda la institución" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduleId">Horario definido (opcional)</Label>
            <Select value={watch('scheduleId')} onValueChange={onScheduleChange} disabled={!branchId}>
              <SelectTrigger id="scheduleId">
                <SelectValue placeholder={branchId ? 'Sin horario — llena tipo/fecha a mano' : 'Elige una sucursal primero'} />
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
            <p className="text-xs text-muted-foreground">
              Si eliges uno de los horarios ya definidos en la sucursal, se llenan solos el tipo y la hora — solo falta la fecha.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventTypeId">Tipo</Label>
            <Controller
              name="eventTypeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="eventTypeId">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.eventTypeId && <p className="text-sm text-destructive">{errors.eventTypeId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Fecha</Label>
              <Controller
                name="eventDate"
                control={control}
                render={({ field }) => <DateInput id="eventDate" value={field.value ?? ''} onChange={field.onChange} />}
              />
              {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora inicio (opcional)</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora fin (opcional)</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupId">Grupo (opcional)</Label>
            <Controller
              name="groupId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="Sin grupo — aplica a sucursal/institución" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNGROUPED_SENTINEL}>Personas sin grupo asignado</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Con grupo, la asistencia se toma solo a sus miembros actuales. "Personas sin grupo asignado" toma solo
              a quienes no están en ninguna célula/sociedad todavía (ej. visitas recientes) — ambos ignoran la
              sucursal de arriba.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
