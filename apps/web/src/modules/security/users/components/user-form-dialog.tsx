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
import { useMeQuery, useRolesQuery, useCreateUserMutation, useAssignRoleMutation } from '@/modules/security';
import { useTenantsQuery, useInstitutionsQuery, useBranchesQuery } from '@/modules/general';
import { getErrorMessage } from '@/lib/toast';

const userSchema = z
  .object({
    tenantId: z.string().optional(),
    roleId: z.string().min(1, 'Selecciona un rol'),
    institutionId: z.string().optional(),
    branchId: z.string().optional(),
    firstName: z.string().min(1, 'El nombre es requerido').max(100),
    lastName: z.string().min(1, 'El apellido es requerido').max(100),
    email: z.string().email('Correo inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
  })
  .superRefine((data, ctx) => {
    if (data.branchId && !data.institutionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['branchId'],
        message: 'Selecciona primero una institución',
      });
    }
  });

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormDialog({ open, onOpenChange }: UserFormDialogProps) {
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !!currentUser && !currentUser.tenantId;
  // isSuperadmin bypasea PermissionsGuard en el backend sin importar su
  // arreglo de permisos (que puede venir vacío) — por eso se chequea aparte,
  // no solo permissions.includes(...).
  const canViewRoles = isSuperadmin || !!currentUser?.permissions?.includes('security.role.view');
  const canViewBranches = isSuperadmin || !!currentUser?.permissions?.includes('core.branch.view');

  const createUserMutation = useCreateUserMutation();
  const assignRoleMutation = useAssignRoleMutation();
  const isPending = createUserMutation.isPending || assignRoleMutation.isPending;
  const hasError = createUserMutation.isError || assignRoleMutation.isError;
  const errorSource = createUserMutation.error ?? assignRoleMutation.error;
  // El usuario ya quedó creado pero sin rol — bajo el guard fail-closed no
  // podrá entrar a nada hasta que alguien le asigne uno a mano (hoy no hay
  // UI para reasignar rol a un usuario ya existente, solo en esta creación).
  const userCreatedButRoleFailed = createUserMutation.isSuccess && assignRoleMutation.isError;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      tenantId: '',
      roleId: '',
      institutionId: '',
      branchId: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  const tenantId = watch('tenantId');
  const institutionId = watch('institutionId');

  const { data: tenants } = useTenantsQuery(isSuperadmin);
  const { data: roles } = useRolesQuery(isSuperadmin ? tenantId || undefined : undefined, canViewRoles);
  const { data: institutions } = useInstitutionsQuery(isSuperadmin ? tenantId || undefined : undefined);
  const { data: branches } = useBranchesQuery(institutionId || '', canViewBranches);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // Al cambiar el tenant, institución/sucursal elegidas ya no aplican.
  useEffect(() => {
    setValue('institutionId', '');
    setValue('branchId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Al cambiar la institución, la sucursal elegida ya no aplica.
  useEffect(() => {
    setValue('branchId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const onSubmit = (values: UserFormValues) => {
    if (isSuperadmin && !values.tenantId) {
      setError('tenantId', { message: 'Selecciona un tenant' });
      return;
    }

    createUserMutation.mutate(
      {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        tenantId: values.tenantId || undefined,
      },
      {
        onSuccess: (user) => {
          assignRoleMutation.mutate(
            {
              userId: user.id,
              roleId: values.roleId,
              institutionId: values.institutionId || undefined,
              branchId: values.branchId || undefined,
              tenantId: values.tenantId || undefined,
            },
            {
              onSuccess: () => onOpenChange(false),
            },
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea un usuario y asígnale un rol (con alcance opcional de institución/sucursal).
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" placeholder="Juan" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" placeholder="Pérez" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" placeholder="juan.perez@empresa.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleId">Rol</Label>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!canViewRoles}>
                  <SelectTrigger id="roleId">
                    <SelectValue placeholder={canViewRoles ? 'Selecciona un rol' : 'No tienes permiso para ver roles'} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="institutionId">Institución (opcional)</Label>
              <Controller
                name="institutionId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="institutionId">
                      <SelectValue placeholder="Todo el tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions?.map((institution) => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal (opcional)</Label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!institutionId}>
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
              {errors.branchId && (
                <p className="text-sm text-destructive">{errors.branchId.message}</p>
              )}
            </div>
          </div>

          {hasError && (
            <p className="text-sm text-destructive">
              {userCreatedButRoleFailed
                ? `El usuario ya se creó, pero no se le pudo asignar el rol: ${getErrorMessage(errorSource)} No podrá acceder al sistema hasta que alguien le asigne un rol — avisa a soporte, no hay forma de reintentar esto desde aquí.`
                : getErrorMessage(errorSource, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
