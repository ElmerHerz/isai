import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useMeQuery } from '@/modules/security';
import {
  useInstitutionTypesQuery,
  useTenantsQuery,
  useCreateTenantMutation,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
} from '@/modules/general';
import { getErrorMessage } from '@/lib/toast';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos (marcas diacríticas combinadas tras NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const institutionSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(150),
    typeCode: z.string().min(1, 'Selecciona un tipo'),
    // Solo aplica para superadmin (sin tenant propio) — ver refine abajo.
    tenantMode: z.enum(['existing', 'new']),
    tenantId: z.string().optional(),
    newTenantName: z.string().optional(),
    newTenantSlug: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tenantMode === 'existing' && !data.tenantId) {
      ctx.addIssue({ code: 'custom', path: ['tenantId'], message: 'Selecciona un tenant' });
    }
    if (data.tenantMode === 'new') {
      if (!data.newTenantName) {
        ctx.addIssue({ code: 'custom', path: ['newTenantName'], message: 'El nombre es requerido' });
      }
      if (!data.newTenantSlug) {
        ctx.addIssue({ code: 'custom', path: ['newTenantSlug'], message: 'El slug es requerido' });
      }
    }
  });

type InstitutionFormValues = z.infer<typeof institutionSchema>;

interface InstitutionFormProps {
  institution?: { id: string; name: string; typeCode: string };
  onSaved: () => void;
}

export function InstitutionForm({ institution, onSaved }: InstitutionFormProps) {
  const isEditing = !!institution;
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !isEditing && !!currentUser && !currentUser.tenantId;
  // isSuperadmin bypasea PermissionsGuard en el backend sin importar su
  // arreglo de permisos (que puede venir vacío) — chequeo aparte del de
  // arriba porque acá aplica sin importar isEditing.
  const isPlatformSuperadmin = !!currentUser && !currentUser.tenantId;
  const canViewInstitutionTypes = isPlatformSuperadmin || !!currentUser?.permissions?.includes('core.institution.view');

  const { data: types } = useInstitutionTypesQuery(canViewInstitutionTypes);
  const { data: tenants } = useTenantsQuery(isSuperadmin);
  const createTenantMutation = useCreateTenantMutation();
  const createMutation = useCreateInstitutionMutation();
  const updateMutation = useUpdateInstitutionMutation();
  const isPending = createTenantMutation.isPending || createMutation.isPending || updateMutation.isPending;
  const hasError = createTenantMutation.isError || createMutation.isError || updateMutation.isError;
  const errorSource = createTenantMutation.error ?? createMutation.error ?? updateMutation.error;
  // El tenant nuevo ya quedó creado pero la institución no — decirlo explícito
  // para que no reintenten "Crear nuevo tenant" con el mismo slug (fallaría
  // como duplicado); la salida es cambiar a "Tenant existente" y elegirlo ahí.
  const tenantCreatedButInstitutionFailed = createTenantMutation.isSuccess && createMutation.isError;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institution?.name ?? '',
      typeCode: institution?.typeCode ?? '',
      tenantMode: 'existing',
      tenantId: '',
      newTenantName: '',
      newTenantSlug: '',
    },
  });

  const tenantMode = watch('tenantMode');
  const newTenantName = watch('newTenantName');

  // Autocompleta el slug desde el nombre, mientras el usuario no lo haya editado a mano.
  useEffect(() => {
    if (tenantMode === 'new' && newTenantName && !dirtyFields.newTenantSlug) {
      setValue('newTenantSlug', slugify(newTenantName));
    }
  }, [newTenantName, tenantMode, dirtyFields.newTenantSlug, setValue]);

  const onSubmit = (values: InstitutionFormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { id: institution.id, dto: { name: values.name, typeCode: values.typeCode } },
        { onSuccess: onSaved },
      );
      return;
    }

    if (isSuperadmin && values.tenantMode === 'new') {
      createTenantMutation.mutate(
        { slug: values.newTenantSlug!, name: values.newTenantName! },
        {
          onSuccess: (tenant) => {
            createMutation.mutate(
              { name: values.name, typeCode: values.typeCode, tenantId: tenant.id },
              { onSuccess: onSaved },
            );
          },
        },
      );
      return;
    }

    createMutation.mutate(
      { name: values.name, typeCode: values.typeCode, tenantId: values.tenantId },
      { onSuccess: onSaved },
    );
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar institución' : 'Nueva institución'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos de la institución.' : 'Crea una institución dentro de un tenant.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperadmin && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Controller
                  name="tenantMode"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'existing' ? 'default' : 'outline'}
                        onClick={() => field.onChange('existing')}
                      >
                        Tenant existente
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'new' ? 'default' : 'outline'}
                        onClick={() => field.onChange('new')}
                      >
                        Crear nuevo tenant
                      </Button>
                    </>
                  )}
                />
              </div>

              {tenantMode === 'existing' ? (
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
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newTenantName">Nombre del tenant</Label>
                    <Input
                      id="newTenantName"
                      placeholder="Príncipe de Paz"
                      {...register('newTenantName')}
                    />
                    {errors.newTenantName && (
                      <p className="text-sm text-destructive">{errors.newTenantName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newTenantSlug">Slug</Label>
                    <Input
                      id="newTenantSlug"
                      placeholder="principe-de-paz"
                      {...register('newTenantSlug')}
                    />
                    {errors.newTenantSlug && (
                      <p className="text-sm text-destructive">{errors.newTenantSlug.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Farmacia San José" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="typeCode">Tipo</Label>
            <Controller
              name="typeCode"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="typeCode">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {types?.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.typeCode && (
              <p className="text-sm text-destructive">{errors.typeCode.message}</p>
            )}
          </div>

          {hasError && (
            <p className="text-sm text-destructive">
              {tenantCreatedButInstitutionFailed
                ? `El tenant ya se creó, pero la institución no: ${getErrorMessage(errorSource)} No hace falta crear el tenant de nuevo — cambia a "Tenant existente" y selecciónalo ahí.`
                : getErrorMessage(errorSource, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
