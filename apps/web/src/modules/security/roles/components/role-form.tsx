import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
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

interface RoleFormProps {
  role?: { id: string; code: string; name: string; description?: string | null; isSystem?: boolean };
  onSaved: () => void;
}

export function RoleForm({ role, onSaved }: RoleFormProps) {
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
    formState: { errors, dirtyFields },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      tenantId: '',
      code: role?.code ?? '',
      name: role?.name ?? '',
      description: role?.description ?? '',
    },
  });

  const name = watch('name');

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
    if (isEditing) {
      updateMutation.mutate(
        { id: role.id, dto: { code: values.code, name: values.name, description: values.description } },
        { onSuccess: onSaved },
      );
      return;
    }

    if (isSuperadmin && !values.tenantId) {
      setError('tenantId', { message: 'Selecciona un tenant' });
      return;
    }

    createMutation.mutate(
      { code: values.code, name: values.name, description: values.description, tenantId: values.tenantId },
      { onSuccess: onSaved },
    );
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar rol' : 'Nuevo rol'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos del rol.' : 'Crea un rol propio del tenant.'}
        </p>

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
              {errors.tenantId && <p className="text-sm text-destructive">{errors.tenantId.message}</p>}
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

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
