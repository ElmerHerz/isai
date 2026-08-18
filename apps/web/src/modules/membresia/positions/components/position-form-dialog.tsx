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
import { useCatalogItemsQuery } from '@/modules/general';
import { useGroupsQuery, usePersonsQuery, useCreatePositionMutation, useUpdatePositionMutation } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { GroupPositionWithRelations } from '@isai/shared-types';

const positionSchema = z.object({
  groupId: z.string().min(1, 'Selecciona un grupo'),
  personId: z.string().min(1, 'Selecciona una persona'),
  positionId: z.string().min(1, 'Selecciona un cargo'),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
});

type PositionFormValues = z.infer<typeof positionSchema>;

const EMPTY_VALUES: PositionFormValues = {
  groupId: '',
  personId: '',
  positionId: '',
  termStart: '',
  termEnd: '',
};

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  position?: GroupPositionWithRelations;
  /** Preselecciona el grupo al crear (ej. desde el detalle de un grupo) — se ignora si `position` viene (editando). */
  defaultGroupId?: string;
}

export function PositionFormDialog({
  open,
  onOpenChange,
  institutionId,
  position,
  defaultGroupId,
}: PositionFormDialogProps) {
  const isEditing = !!position;
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const { data: groups } = useGroupsQuery(institutionId);
  const { data: persons } = usePersonsQuery(institutionId, canViewPersons);
  const { data: boardPositions } = useCatalogItemsQuery('board_position');
  const createMutation = useCreatePositionMutation();
  const updateMutation = useUpdatePositionMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        position
          ? {
              groupId: position.groupId,
              personId: position.personId,
              positionId: position.positionId,
              termStart: position.termStart.slice(0, 10),
              termEnd: position.termEnd ? position.termEnd.slice(0, 10) : '',
            }
          : { ...EMPTY_VALUES, groupId: defaultGroupId ?? '' },
      );
    }
  }, [open, position, defaultGroupId, reset]);

  const onSubmit = (values: PositionFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const dto = {
      ...values,
      termStart: values.termStart || undefined,
      termEnd: values.termEnd || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: position.id, dto }, { onSuccess });
    } else {
      createMutation.mutate(dto, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cargo' : 'Nuevo cargo de directiva'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la vigencia o los datos del cargo.' : 'Asigna a una persona un cargo dentro de un grupo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupId">Grupo</Label>
            <Controller
              name="groupId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.groupId && <p className="text-sm text-destructive">{errors.groupId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="personId">Persona</Label>
            <Controller
              name="personId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!canViewPersons}>
                  <SelectTrigger id="personId">
                    <SelectValue placeholder={canViewPersons ? 'Selecciona una persona' : 'No tienes permiso para ver personas'} />
                  </SelectTrigger>
                  <SelectContent>
                    {persons?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.personId && <p className="text-sm text-destructive">{errors.personId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="positionId">Cargo</Label>
            <Controller
              name="positionId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="positionId">
                    <SelectValue placeholder="Selecciona un cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardPositions?.map((bp) => (
                      <SelectItem key={bp.id} value={bp.id}>
                        {bp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.positionId && <p className="text-sm text-destructive">{errors.positionId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="termStart">Vigente desde (vacío = hoy)</Label>
              <Controller
                name="termStart"
                control={control}
                render={({ field }) => <DateInput id="termStart" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termEnd">Vigente hasta (opcional)</Label>
              <Controller
                name="termEnd"
                control={control}
                render={({ field }) => <DateInput id="termEnd" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
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
