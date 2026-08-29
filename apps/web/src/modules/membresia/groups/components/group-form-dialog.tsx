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
import { PersonCombobox } from '@/modules/membresia/persons/components/person-combobox';
import { useCatalogItemsQuery, useBranchesQuery } from '@/modules/general';
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateGroupMutation, useUpdateGroupMutation, usePersonsQuery } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { GroupWithRelations } from '@isai/shared-types';

const ASSET_ACCOUNT_TYPE = 'ASSET';

const groupSchema = z.object({
  groupTypeId: z.string().min(1, 'Selecciona un tipo'),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  branchId: z.string().optional(),
  description: z.string().optional(),
  leaderPersonId: z.string().optional(),
  cashAccountId: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

const EMPTY_VALUES: GroupFormValues = {
  groupTypeId: '',
  name: '',
  branchId: '',
  description: '',
  leaderPersonId: '',
  cashAccountId: '',
};

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  group?: GroupWithRelations;
}

export function GroupFormDialog({ open, onOpenChange, institutionId, group }: GroupFormDialogProps) {
  const isEditing = !!group;
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const canViewBranches = permissions.includes('core.branch.view');
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: groupTypes } = useCatalogItemsQuery('group_type');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: persons } = usePersonsQuery(institutionId, canViewPersons);
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const cashAccounts = accounts?.filter((a) => a.accountType.code === ASSET_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const createMutation = useCreateGroupMutation();
  const updateMutation = useUpdateGroupMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        group
          ? {
              groupTypeId: group.groupTypeId,
              name: group.name,
              branchId: group.branchId ?? '',
              description: group.description ?? '',
              leaderPersonId: group.leaderPersonId ?? '',
              cashAccountId: group.cashAccountId ?? '',
            }
          : EMPTY_VALUES,
      );
    }
  }, [open, group, reset]);

  const onSubmit = (values: GroupFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const dto = {
      ...values,
      branchId: values.branchId || undefined,
      description: values.description || undefined,
      leaderPersonId: values.leaderPersonId || undefined,
      cashAccountId: values.cashAccountId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: group.id, dto }, { onSuccess });
    } else {
      createMutation.mutate({ ...dto, institutionId }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del grupo.' : 'Crea una célula, sociedad, ministerio u otro grupo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Célula Los Olivos" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupTypeId">Tipo</Label>
            <Controller
              name="groupTypeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="groupTypeId">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.groupTypeId && <p className="text-sm text-destructive">{errors.groupTypeId.message}</p>}
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
            <Label htmlFor="leaderPersonId">Líder (opcional)</Label>
            <Controller
              name="leaderPersonId"
              control={control}
              render={({ field }) => (
                <PersonCombobox
                  id="leaderPersonId"
                  persons={persons ?? []}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={canViewPersons ? 'Sin líder asignado' : 'No tienes permiso para ver personas'}
                  disabled={!canViewPersons}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashAccountId">Cuenta de caja del fondo (opcional)</Label>
            <Controller
              name="cashAccountId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cashAccountId">
                    <SelectValue placeholder="Sin configurar — bloquea registrar movimientos del fondo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Dónde vive físicamente el dinero del fondo propio de este grupo (ej. "Caja: Fondo Músicos") — distinta de la Caja General de la sucursal. Se puede configurar después.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" {...register('description')} />
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
