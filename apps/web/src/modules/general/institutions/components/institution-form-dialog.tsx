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
    .replace(/[\u0300-\u036f]/g, '') // quita acentos (marcas diacríticas combinadas tras NFD)
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

interface InstitutionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institution?: { id: string; name: string; typeCode: string };
}

export function InstitutionFormDialog({
  open,
  onOpenChange,
  institution,
}: InstitutionFormDialogProps) {
  const isEditing = !!institution;
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !isEditing && !!currentUser && !currentUser.tenantId;

  const { data: types } = useInstitutionTypesQuery();
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
    reset,
    formState: { errors, dirtyFields },
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: '',
      typeCode: '',
      tenantMode: 'existing',
      tenantId: '',
      newTenantName: '',
      newTenantSlug: '',
    },
  });

  const tenantMode = watch('tenantMode');
  const newTenantName = watch('newTenantName');

  useEffect(() => {
    if (open) {
      reset({
        name: institution?.name ?? '',
        typeCode: institution?.typeCode ?? '',
        tenantMode: 'existing',
        tenantId: '',
        newTenantName: '',
        newTenantSlug: '',
      });
    }
  }, [open, institution, reset]);

  // Autocompleta el slug desde el nombre, mientras el usuario no lo haya editado a mano.
  useEffect(() => {
    if (tenantMode === 'new' && newTenantName && !dirtyFields.newTenantSlug) {
      setValue('newTenantSlug', slugify(newTenantName));
    }
  }, [newTenantName, tenantMode, dirtyFields.newTenantSlug, setValue]);

  const onSubmit = (values: InstitutionFormValues) => {
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateMutation.mutate(
        { id: institution.id, dto: { name: values.name, typeCode: values.typeCode } },
        { onSuccess },
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
              { onSuccess },
            );
          },
        },
      );
      return;
    }

    createMutation.mutate(
      { name: values.name, typeCode: values.typeCode, tenantId: values.tenantId },
      { onSuccess },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar institución' : 'Nueva institución'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los datos de la institución.'
              : 'Crea una institución dentro de un tenant.'}
          </DialogDescription>
        </DialogHeader>

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
