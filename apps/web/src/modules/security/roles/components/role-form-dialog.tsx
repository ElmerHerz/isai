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
import { useMeQuery, useCreateRoleMutation, useUpdateRoleMutation } from '@/modules/security';
import { useTenantsQuery } from '@/modules/general';

// MAYUSCULAS_CON_GUION_BAJO, sin acentos — mismo criterio de "autocompletar
// pero dejar editar" que el slug de tenant en institution-form-dialog.tsx.
function toRoleCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const roleSchema = z.object({
  tenantId: z.string().optional(),
  code: z.string().min(1, 'El código es requerido').max(50),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: { id: string; code: string; name: string; description?: string | null; isSystem?: boolean };
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEditing = !!role;
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !isEditing && !!currentUser && !currentUser.tenantId;

  const { data: tenants } = useTenantsQuery(isSuperadmin);
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { tenantId: '', code: '', name: '', description: '' },
  });

  const name = watch('name');

  useEffect(() => {
    if (open) {
      reset({
        tenantId: '',
        code: role?.code ?? '',
        name: role?.name ?? '',
        description: role?.description ?? '',
      });
    }
  }, [open, role, reset]);

  // Autocompleta el código desde el nombre mientras el usuario no lo haya
  // tocado a mano — evita que tenga que inventarse un identificador él mismo
  // y reduce el riesgo de que choque con uno ya usado en el tenant.
  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toRoleCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: RoleFormValues) => {
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateMutation.mutate(
        { id: role.id, dto: { code: values.code, name: values.name, description: values.description } },
        { onSuccess },
      );
      return;
    }

    if (isSuperadmin && !values.tenantId) {
      setError('tenantId', { message: 'Selecciona un tenant' });
      return;
    }

    createMutation.mutate(
      { code: values.code, name: values.name, description: values.description, tenantId: values.tenantId },
      { onSuccess },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del rol.' : 'Crea un rol propio del tenant.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperadmin && (
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant</Label>
              <Controller
                name="tenantId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tenantId">
                      <SelectValue placeholder="Selecciona un tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tenantId && (
                <p className="text-sm text-destructive">{errors.tenantId.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Tesorero" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              Código{' '}
              {role?.isSystem ? (
                <span className="font-normal text-muted-foreground">(no editable)</span>
              ) : (
                <span className="font-normal text-muted-foreground">(se autocompleta, puedes cambiarlo)</span>
              )}
            </Label>
            <Input id="code" placeholder="TESORERO" disabled={role?.isSystem} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" placeholder="Maneja los ingresos y egresos" {...register('description')} />
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
