import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreateFundTypeMutation, useUpdateFundTypeMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';
import type { FundType } from '@isai/shared-types';

// MAYUSCULAS_CON_GUION_BAJO, sin acentos — mismo criterio que
// milestone-type-form.tsx.
function toTypeCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const fundTypeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, 'Solo letras, números y guion bajo')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  tracksDonors: z.boolean(),
});

type FundTypeFormValues = z.infer<typeof fundTypeSchema>;

interface FundTypeFormProps {
  type?: FundType;
  /** Solo para superadmin creando: a qué tenant pertenece el tipo nuevo. */
  tenantId?: string;
  onSaved: () => void;
}

export function FundTypeForm({ type, tenantId, onSaved }: FundTypeFormProps) {
  const isEditing = !!type;
  const createMutation = useCreateFundTypeMutation();
  const updateMutation = useUpdateFundTypeMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useForm<FundTypeFormValues>({
    resolver: zodResolver(fundTypeSchema),
    defaultValues: { code: type?.code ?? '', name: type?.name ?? '', tracksDonors: type?.tracksDonors ?? false },
  });

  const name = watch('name');

  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toTypeCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: FundTypeFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: type.id, dto: { name: values.name, tracksDonors: values.tracksDonors } }, { onSuccess: onSaved });
    } else {
      createMutation.mutate({ code: values.code, name: values.name, tracksDonors: values.tracksDonors, tenantId }, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar tipo de fondo' : 'Nuevo tipo de fondo'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza el nombre.' : 'Se agrega solo para tu organización — otros tenants no lo verán.'}
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
            <Input id="code" placeholder="OFRENDA" disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ofrenda" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="tracksDonors">Registra donantes por nombre</Label>
              <p className="text-xs text-muted-foreground">
                Permite identificar quién dio cuánto en las colectas de este tipo de fondo (para comprobantes de
                donación). Déjalo apagado si la ofrenda se registra anónima.
              </p>
            </div>
            <Controller
              name="tracksDonors"
              control={control}
              render={({ field }) => (
                <Switch id="tracksDonors" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
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
