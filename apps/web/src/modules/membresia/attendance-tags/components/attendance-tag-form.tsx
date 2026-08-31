import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateAttendanceTagMutation, useUpdateAttendanceTagMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';
import type { AttendanceTag } from '@isai/shared-types';

// MAYUSCULAS_CON_GUION_BAJO, sin acentos — mismo criterio que
// catalog-item-form.tsx.
function toTagCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const attendanceTagSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, 'Solo letras, números y guion bajo')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

type AttendanceTagFormValues = z.infer<typeof attendanceTagSchema>;

interface AttendanceTagFormProps {
  tag?: AttendanceTag;
  /** Solo para superadmin creando: a qué tenant pertenece la etiqueta nueva. */
  tenantId?: string;
  onSaved: () => void;
}

export function AttendanceTagForm({ tag, tenantId, onSaved }: AttendanceTagFormProps) {
  const isEditing = !!tag;
  const createMutation = useCreateAttendanceTagMutation();
  const updateMutation = useUpdateAttendanceTagMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<AttendanceTagFormValues>({
    resolver: zodResolver(attendanceTagSchema),
    defaultValues: { code: tag?.code ?? '', name: tag?.name ?? '' },
  });

  const name = watch('name');

  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toTagCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: AttendanceTagFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: tag.id, dto: { name: values.name } }, { onSuccess: onSaved });
    } else {
      createMutation.mutate({ code: values.code, name: values.name, tenantId }, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar etiqueta de asistencia' : 'Nueva etiqueta de asistencia'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza el nombre.' : 'Se agrega solo para tu organización — otros tenants no la verán.'}
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
            <Input id="code" placeholder="UNIFORME" disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Uniforme" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
