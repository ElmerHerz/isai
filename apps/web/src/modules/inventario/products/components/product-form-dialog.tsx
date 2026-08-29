import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateProductMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import {
  ProductFormFields,
  productSchema,
  EMPTY_PRODUCT_VALUES,
  NO_CATEGORY_SENTINEL,
  type ProductFormValues,
} from './product-form-fields';

// Solo crea — editar un producto existente vive inline en la pestaña "Datos"
// de /inventory/products/$productId (ProductDetailsTab), no en este modal.
interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductFormDialog({ open, onOpenChange }: ProductFormDialogProps) {
  const createMutation = useCreateProductMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT_VALUES,
  });

  useEffect(() => {
    if (open) reset(EMPTY_PRODUCT_VALUES);
  }, [open, reset]);

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
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>Agrega un producto al catálogo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ProductFormFields control={control} register={register} errors={errors} setValue={setValue} />

          {createMutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(createMutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
