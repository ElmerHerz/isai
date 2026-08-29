import { useState } from 'react';
import { Controller, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { AssetSourceLinkPicker } from './asset-source-link-picker';

export const assetSchema = z.object({
  // Solo lo usa AssetFormDialog (creación) — AssetDetailsTab (edición) nunca
  // lo registra ni lo envía, la sucursal no se edita ahí.
  branchId: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  categoryCode: z.string().optional(),
  quantity: z.string().optional(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.string().optional(),
  location: z.string().optional(),
  sourceType: z.union([z.literal('project_expense'), z.literal('group_fund_expense')]).optional(),
  sourceId: z.string().optional(),
  notes: z.string().optional(),
});

export type AssetFormValues = z.infer<typeof assetSchema>;

export const EMPTY_ASSET_VALUES: AssetFormValues = {
  branchId: undefined,
  name: '',
  categoryCode: '',
  quantity: '1',
  serialNumber: '',
  acquisitionDate: '',
  acquisitionCost: '',
  location: '',
  sourceType: undefined,
  sourceId: undefined,
  notes: '',
};

// Campos compartidos entre AssetFormDialog (crear) y AssetDetailsTab
// (editar, inline) — mismo criterio que ProductFormFields.
export function AssetFormFields({
  control,
  register,
  errors,
  institutionId,
}: {
  control: Control<AssetFormValues>;
  register: UseFormRegister<AssetFormValues>;
  errors: FieldErrors<AssetFormValues>;
  institutionId: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" placeholder="Bocina JBL EON615" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="categoryCode">Categoría (opcional)</Label>
          <Input id="categoryCode" placeholder="Audio" {...register('categoryCode')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input id="quantity" type="number" step="1" min="1" {...register('quantity')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Número de serie (opcional)</Label>
          <Input id="serialNumber" {...register('serialNumber')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Ubicación (opcional)</Label>
          <Input id="location" placeholder="Bodega principal" {...register('location')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="acquisitionDate">Fecha de adquisición (opcional)</Label>
          <Controller
            name="acquisitionDate"
            control={control}
            render={({ field }) => <DateInput id="acquisitionDate" value={field.value ?? ''} onChange={field.onChange} />}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisitionCost">Costo de adquisición (opcional)</Label>
          <Input id="acquisitionCost" type="number" step="0.01" min="0" {...register('acquisitionCost')} />
          <p className="text-xs text-muted-foreground">Solo referencia — no genera asiento contable.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Input id="notes" {...register('notes')} />
      </div>

      <div className="space-y-2">
        {!linkOpen ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setLinkOpen(true)}
          >
            ¿De qué gasto salió? Vincular a un gasto ya registrado (opcional)
          </button>
        ) : (
          <>
            <Label>Vincular a un gasto ya registrado (opcional)</Label>
            <Controller
              name="sourceType"
              control={control}
              render={({ field: sourceTypeField }) => (
                <Controller
                  name="sourceId"
                  control={control}
                  render={({ field: sourceIdField }) => (
                    <AssetSourceLinkPicker
                      institutionId={institutionId}
                      sourceType={sourceTypeField.value}
                      sourceId={sourceIdField.value}
                      onChange={({ sourceType, sourceId }) => {
                        sourceTypeField.onChange(sourceType);
                        sourceIdField.onChange(sourceId);
                      }}
                    />
                  )}
                />
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
