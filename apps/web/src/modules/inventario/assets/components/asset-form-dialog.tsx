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
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useBranchesQuery } from '@/modules/general';
import { useCreateAssetMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import { AssetFormFields, assetSchema, EMPTY_ASSET_VALUES, type AssetFormValues } from './asset-form-fields';

// Radix Select no admite value="" — mismo sentinel que ya usa BudgetFormDialog.
const WHOLE_INSTITUTION_SENTINEL = '__whole_institution__';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

// Solo crea — editar un activo existente vive inline en la pestaña "Datos"
// de /inventory/assets/$assetId (AssetDetailsTab), mismo criterio que Product.
export function AssetFormDialog({ open, onOpenChange, institutionId }: AssetFormDialogProps) {
  const { data: branches } = useBranchesQuery(institutionId, !!institutionId);
  const createMutation = useCreateAssetMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { ...EMPTY_ASSET_VALUES, branchId: WHOLE_INSTITUTION_SENTINEL },
  });

  useEffect(() => {
    if (open) reset({ ...EMPTY_ASSET_VALUES, branchId: WHOLE_INSTITUTION_SENTINEL });
  }, [open, reset]);

  const branchId = watch('branchId');

  const onSubmit = (values: AssetFormValues) => {
    createMutation.mutate(
      {
        institutionId,
        branchId: values.branchId === WHOLE_INSTITUTION_SENTINEL ? undefined : values.branchId,
        name: values.name,
        categoryCode: values.categoryCode || undefined,
        quantity: values.quantity ? Number(values.quantity) : undefined,
        serialNumber: values.serialNumber || undefined,
        acquisitionDate: values.acquisitionDate || undefined,
        acquisitionCost: values.acquisitionCost ? Number(values.acquisitionCost) : undefined,
        location: values.location || undefined,
        sourceType: values.sourceType,
        sourceId: values.sourceId,
        notes: values.notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo activo</DialogTitle>
          <DialogDescription>Equipo o mobiliario duradero — quién lo tiene, dónde está, en qué estado.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchId">Alcance</Label>
            <Select value={branchId} onValueChange={(v) => setValue('branchId', v)}>
              <SelectTrigger id="branchId">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WHOLE_INSTITUTION_SENTINEL}>Toda la institución</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AssetFormFields control={control} register={register} errors={errors} institutionId={institutionId} />

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
