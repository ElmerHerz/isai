import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInstitutionTypeMutation, useUpdateInstitutionTypeMutation } from '@/modules/general';
import type { InstitutionType } from '@isai/shared-types';

// MAYUSCULAS_CON_GUION_BAJO, sin acentos — mismo criterio que toRoleCode()
// en role-form.tsx.
function toCatalogCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const institutionTypeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/, 'Solo letras, números y guion bajo')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
});

type InstitutionTypeFormValues = z.infer<typeof institutionTypeSchema>;

interface InstitutionTypeFormProps {
  institutionType?: InstitutionType;
  onSaved: () => void;
}

export function InstitutionTypeForm({ institutionType, onSaved }: InstitutionTypeFormProps) {
  const isEditing = !!institutionType;
  const createMutation = useCreateInstitutionTypeMutation();
  const updateMutation = useUpdateInstitutionTypeMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<InstitutionTypeFormValues>({
    resolver: zodResolver(institutionTypeSchema),
    defaultValues: {
      code: institutionType?.code ?? '',
      name: institutionType?.name ?? '',
      description: institutionType?.description ?? '',
    },
  });

  const name = watch('name');

  // Autocompleta el código desde el nombre mientras el usuario no lo haya
  // tocado a mano — mismo patrón que rol/tenant, evita que tenga que
  // inventarse un identificador él mismo.
  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toCatalogCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: InstitutionTypeFormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { code: institutionType.code, dto: { name: values.name, description: values.description } },
        { onSuccess: onSaved },
      );
    } else {
      createMutation.mutate(values, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar tipo de institución' : 'Nuevo tipo de institución'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos del tipo de institución.' : 'Agrega un tipo de institución al catálogo global.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código{' '}
              {isEditing ? (
                <span className="font-normal text-muted-foreground">(no editable)</span>
              ) : (
                <span className="font-normal text-muted-foreground">(se autocompleta, puedes cambiarlo)</span>
              )}
            </Label>
            <Input id="code" placeholder="CHURCH" disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Iglesia" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Instituciones religiosas con una o más sedes"
              {...register('description')}
            />
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
