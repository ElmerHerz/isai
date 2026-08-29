import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUpdateProductMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import {
  ProductFormFields,
  productSchema,
  NO_CATEGORY_SENTINEL,
  type ProductFormValues,
} from './product-form-fields';
import type { Product } from '@isai/shared-types';

interface ProductDetailsTabProps {
  product: Product;
}

// Editar inline, sin modal — pedido explícito de sesión: no tiene sentido un
// diálogo aparte cuando ya hay una página de detalle con espacio de sobra.
export function ProductDetailsTab({ product }: ProductDetailsTabProps) {
  const updateMutation = useUpdateProductMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? NO_CATEGORY_SENTINEL,
      unitCode: product.unitCode,
      salePrice: product.salePrice ?? '',
      tracksInventory: product.tracksInventory,
    },
  });

  useEffect(() => {
    reset({
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? NO_CATEGORY_SENTINEL,
      unitCode: product.unitCode,
      salePrice: product.salePrice ?? '',
      tracksInventory: product.tracksInventory,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const onSubmit = (values: ProductFormValues) => {
    updateMutation.mutate(
      {
        id: product.id,
        dto: {
          // null, no undefined — este formulario siempre reenvía todos los
          // campos, así que "queda vacío" debe limpiar el valor guardado,
          // no dejarlo intacto (ver UpdateProductInput/UpdateProductDto).
          sku: values.sku || null,
          barcode: values.barcode || null,
          name: values.name,
          description: values.description || null,
          categoryId: values.categoryId === NO_CATEGORY_SENTINEL ? null : values.categoryId,
          unitCode: values.unitCode,
          salePrice: values.salePrice ? Number(values.salePrice) : null,
          tracksInventory: values.tracksInventory,
        },
      },
      // Reinicia el "baseline" del formulario a lo que se acaba de guardar —
      // sin esto, isDirty se queda en true para siempre después del primer
      // cambio (react-hook-form lo compara contra los defaultValues
      // originales, no contra lo último guardado) y "Guardar cambios" nunca
      // se vuelve a deshabilitar aunque no haya nada nuevo que guardar.
      { onSuccess: () => reset(values) },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ProductFormFields
        control={control}
        register={register}
        errors={errors}
        setValue={setValue}
        extraSwitches={
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={product.isActive}
              onCheckedChange={(checked) => updateMutation.mutate({ id: product.id, dto: { isActive: checked } })}
            />
            <Label htmlFor="isActive" className="font-normal">Producto activo</Label>
          </div>
        }
      />

      {updateMutation.isError && (
        <p className="text-sm text-destructive">{getErrorMessage(updateMutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
      )}

      <Button type="submit" size="sm" disabled={updateMutation.isPending || !isDirty}>
        {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
