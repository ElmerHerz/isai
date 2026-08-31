import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSupplierMutation, useUpdateSupplierMutation } from '@/modules/comercio';
import { getErrorMessage } from '@/lib/toast';
import type { Supplier } from '@isai/shared-types';

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  taxId: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.union([z.string().email('Correo inválido'), z.literal('')]).optional(),
  address: z.string().max(255).optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

const EMPTY_VALUES: SupplierFormValues = { name: '', taxId: '', phone: '', email: '', address: '', notes: '' };

interface SupplierFormProps {
  supplier?: Supplier;
  onSaved: () => void;
}

// Un solo formulario para crear/editar — entidad simple, mismo criterio que
// AccountForm. Vive en su propia pantalla (store/suppliers/new.tsx y
// store/suppliers/$supplierId.tsx), ya no en un modal.
export function SupplierForm({ supplier, onSaved }: SupplierFormProps) {
  const isEditing = !!supplier;
  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          taxId: supplier.taxId ?? '',
          phone: supplier.phone ?? '',
          email: supplier.email ?? '',
          address: supplier.address ?? '',
          notes: supplier.notes ?? '',
        }
      : EMPTY_VALUES,
  });

  const onSubmit = (values: SupplierFormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: supplier.id,
          dto: {
            name: values.name,
            taxId: values.taxId || null,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
          },
        },
        { onSuccess: onSaved },
      );
    } else {
      createMutation.mutate(
        {
          name: values.name,
          taxId: values.taxId || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        },
        { onSuccess: onSaved },
      );
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos del proveedor.' : 'Un proveedor sirve para todas las sucursales del tenant.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Distribuidora El Salvador" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxId">NIT / Registro fiscal (opcional)</Label>
              <Input id="taxId" {...register('taxId')} />
              {errors.taxId && <p className="text-sm text-destructive">{errors.taxId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo (opcional)</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección (opcional)</Label>
            <Input id="address" {...register('address')} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
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
