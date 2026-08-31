import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreateProductMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import {
  ProductFormFields,
  productSchema,
  EMPTY_PRODUCT_VALUES,
  NO_CATEGORY_SENTINEL,
  type ProductFormValues,
} from '@/modules/inventario/products/components/product-form-fields';

export const Route = createFileRoute('/_authenticated/inventory/products/new')({
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const createMutation = useCreateProductMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT_VALUES,
  });

  const onSubmit = (values: ProductFormValues) => {
    createMutation.mutate(
      {
        sku: values.sku || undefined,
        barcode: values.barcode || undefined,
        name: values.name,
        description: values.description || undefined,
        categoryId: values.categoryId === NO_CATEGORY_SENTINEL ? undefined : values.categoryId,
        unitCode: values.unitCode,
        salePrice: values.salePrice ? Number(values.salePrice) : undefined,
        tracksInventory: values.tracksInventory,
      },
      {
        onSuccess: (product) =>
          navigate({ to: '/inventory/products/$productId', params: { productId: product.id } }),
      },
    );
  };

  return (
    <div>
      <Link
        to="/inventory/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Productos
      </Link>

      <Card className="mt-4 rounded-2xl">
        <CardContent className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Nuevo producto</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <ProductFormFields control={control} register={register} errors={errors} setValue={setValue} />

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {getErrorMessage(createMutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
