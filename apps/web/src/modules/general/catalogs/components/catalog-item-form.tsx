import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCatalogItemMutation, useUpdateCatalogItemMutation } from '@/modules/general';
import type { CatalogItem } from '@isai/shared-types';

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

const catalogItemSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, 'Solo letras, números y guion bajo')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;

interface CatalogItemFormProps {
  catalogCode: string;
  item?: CatalogItem;
  onSaved: () => void;
}

export function CatalogItemForm({ catalogCode, item, onSaved }: CatalogItemFormProps) {
  const isEditing = !!item;
  const createMutation = useCreateCatalogItemMutation();
  const updateMutation = useUpdateCatalogItemMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CatalogItemFormValues>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: { code: item?.code ?? '', name: item?.name ?? '' },
  });

  const name = watch('name');

  // Autocompleta el código desde el nombre mientras el usuario no lo haya
  // tocado a mano — mismo patrón que rol/tenant/tipo de institución.
  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toCatalogCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: CatalogItemFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: item.id, dto: { name: values.name } }, { onSuccess: onSaved });
    } else {
      createMutation.mutate({ catalogCode, code: values.code, name: values.name }, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar tipo de horario' : 'Nuevo tipo de horario'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza el nombre.' : 'Agrega un tipo de horario al catálogo global.'}
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
            <Input id="code" placeholder="VIGIL" disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Vigilia" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
