import { useState, type ReactNode } from 'react';
import { Controller, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useProductCategoriesQuery, useCreateProductCategoryMutation } from '@/modules/inventario';

// Radix Select no admite value="" — mismo sentinel que ya usa BudgetFormDialog
// para "toda la institución"; acá para "sin categoría".
export const NO_CATEGORY_SENTINEL = '__no_category__';

export const UNIT_OPTIONS = [
  { code: 'UNIT', label: 'Unidad' },
  { code: 'BOX', label: 'Caja' },
  { code: 'LB', label: 'Libra' },
  { code: 'LT', label: 'Litro' },
  { code: 'FARDO', label: 'Fardo' },
];

export const productSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  description: z.string().optional(),
  categoryId: z.string(),
  unitCode: z.string().min(1, 'Selecciona una unidad'),
  salePrice: z.string().optional(),
  tracksInventory: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const EMPTY_PRODUCT_VALUES: ProductFormValues = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: NO_CATEGORY_SENTINEL,
  unitCode: 'UNIT',
  salePrice: '',
  tracksInventory: true,
};

// Campos compartidos entre ProductFormDialog (crear) y ProductDetailsTab
// (editar, inline en la página de detalle) — misma lógica de categoría con
// creación rápida, sin duplicarla en dos formularios. Las presentaciones de
// empaque (Caja, Fardo...) NO viven acá — tienen su propia pestaña
// "Presentaciones" en el detalle de producto (product-units-tab.tsx), porque
// un producto puede tener más de una y cada una se agrega/quita por separado.
export function ProductFormFields({
  control,
  register,
  errors,
  setValue,
  extraSwitches,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  /** Switches adicionales del caller (ej. "Producto activo" en ProductDetailsTab) — se
   * renderizan en la misma fila que "Lleva control de existencia" en vez de apilarse. */
  extraSwitches?: ReactNode;
}) {
  const { data: categories } = useProductCategoriesQuery();
  const createCategoryMutation = useCreateProductCategoryMutation();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(newCategoryName.trim(), {
      onSuccess: (category) => {
        setValue('categoryId', category.id);
        setAddingCategory(false);
        setNewCategoryName('');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" placeholder="Martillo 16oz" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU (opcional)</Label>
          <Input id="sku" {...register('sku')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Código de barras (opcional)</Label>
          <Input id="barcode" {...register('barcode')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY_SENTINEL}>Sin categoría</SelectItem>
                  {categories
                    ?.filter((category) => category.isActive || category.id === field.value)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {!addingCategory ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setAddingCategory(true)}
            >
              ¿No está en la lista? Crear categoría nueva
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Nombre de la categoría"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleAddCategory}
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitCode">Unidad</Label>
          <Controller
            name="unitCode"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="unitCode">
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit.code} value={unit.code}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Input id="description" {...register('description')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salePrice">Precio de venta (opcional)</Label>
          <Input id="salePrice" type="number" step="0.01" min="0" {...register('salePrice')} />
          <p className="text-xs text-muted-foreground">Vacío = este producto no se vende, solo uso interno.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Controller
            name="tracksInventory"
            control={control}
            render={({ field }) => (
              <Switch id="tracksInventory" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="tracksInventory" className="font-normal">Lleva control de existencia</Label>
        </div>
        {extraSwitches}
      </div>
    </div>
  );
}
