import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUpdateAssetMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import { AssetFormFields, assetSchema, type AssetFormValues } from './asset-form-fields';
import type { Asset } from '@isai/shared-types';

interface AssetDetailsTabProps {
  asset: Asset;
}

// Editar inline, sin modal — mismo criterio que ProductDetailsTab. Sin
// branchId acá (la sucursal no se edita después de crear el activo).
export function AssetDetailsTab({ asset }: AssetDetailsTabProps) {
  const updateMutation = useUpdateAssetMutation();

  const defaultValues: AssetFormValues = {
    name: asset.name,
    categoryCode: asset.categoryCode ?? '',
    quantity: String(asset.quantity),
    serialNumber: asset.serialNumber ?? '',
    acquisitionDate: asset.acquisitionDate?.slice(0, 10) ?? '',
    acquisitionCost: asset.acquisitionCost ?? '',
    location: asset.location ?? '',
    sourceType: asset.sourceType ?? undefined,
    sourceId: asset.sourceId ?? undefined,
    notes: asset.notes ?? '',
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  const onSubmit = (values: AssetFormValues) => {
    updateMutation.mutate(
      {
        id: asset.id,
        dto: {
          name: values.name,
          categoryCode: values.categoryCode || null,
          quantity: values.quantity ? Number(values.quantity) : undefined,
          serialNumber: values.serialNumber || null,
          acquisitionDate: values.acquisitionDate || null,
          acquisitionCost: values.acquisitionCost ? Number(values.acquisitionCost) : null,
          sourceType: values.sourceType ?? null,
          sourceId: values.sourceId ?? null,
          notes: values.notes || null,
        },
      },
      { onSuccess: () => reset(values) },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AssetFormFields control={control} register={register} errors={errors} institutionId={asset.institutionId} />

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={asset.isActive}
          onCheckedChange={(checked) => updateMutation.mutate({ id: asset.id, dto: { isActive: checked } })}
        />
        <Label htmlFor="isActive" className="font-normal">Activo (no dado de baja)</Label>
      </div>

      {updateMutation.isError && (
        <p className="text-sm text-destructive">{getErrorMessage(updateMutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
      )}

      <Button type="submit" size="sm" disabled={updateMutation.isPending || !isDirty}>
        {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
