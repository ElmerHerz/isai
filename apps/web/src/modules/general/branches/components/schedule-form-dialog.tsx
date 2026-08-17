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
import {
  useCatalogItemsQuery,
  useCreateBranchScheduleMutation,
  useUpdateBranchScheduleMutation,
} from '@/modules/general';
import type { BranchSchedule } from '@isai/shared-types';

// value = convención Postgres EXTRACT(DOW): 0=domingo..6=sábado (igual que day_of_week en la base).
export const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

const scheduleSchema = z.object({
  scheduleTypeId: z.string().min(1, 'Selecciona un tipo'),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_PATTERN, 'Formato HH:mm'),
  endTime: z.string().regex(TIME_PATTERN, 'Formato HH:mm').optional().or(z.literal('')),
  label: z.string().max(150).optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  schedule?: BranchSchedule;
}

// "1970-01-01T10:00:00.000Z" -> "10:00" (Prisma serializa columnas @db.Time así)
function toTimeInput(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(11, 16);
}

export function ScheduleFormDialog({ open, onOpenChange, branchId, schedule }: ScheduleFormDialogProps) {
  const isEditing = !!schedule;
  const { data: scheduleTypes } = useCatalogItemsQuery('schedule_type');
  const createMutation = useCreateBranchScheduleMutation(branchId);
  const updateMutation = useUpdateBranchScheduleMutation(branchId);
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { scheduleTypeId: '', dayOfWeek: 1, startTime: '', endTime: '', label: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        scheduleTypeId: schedule?.scheduleTypeId ?? '',
        dayOfWeek: schedule?.dayOfWeek ?? 1,
        startTime: toTimeInput(schedule?.startTime),
        endTime: toTimeInput(schedule?.endTime),
        label: schedule?.label ?? '',
      });
    }
  }, [open, schedule, reset]);

  const onSubmit = (values: ScheduleFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const dto = {
      scheduleTypeId: values.scheduleTypeId,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime || undefined,
      label: values.label || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: schedule.id, dto }, { onSuccess });
    } else {
      createMutation.mutate(dto, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar franja' : 'Nueva franja de horario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza esta franja de horario.' : 'Agrega una franja de horario recurrente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduleTypeId">Tipo</Label>
            <Controller
              name="scheduleTypeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="scheduleTypeId">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.scheduleTypeId && (
              <p className="text-sm text-destructive">{errors.scheduleTypeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Día</Label>
            <Controller
              name="dayOfWeek"
              control={control}
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue placeholder="Selecciona un día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora inicio</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora fin (opcional)</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
              {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta (opcional)</Label>
            <Input id="label" placeholder="Culto Dominical" {...register('label')} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'No se pudo guardar. Verifica los datos e intenta de nuevo.'}
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
