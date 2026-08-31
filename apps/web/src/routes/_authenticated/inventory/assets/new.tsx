import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useBranchesQuery, useInstitutionsQuery } from '@/modules/general';
import { useCreateAssetMutation } from '@/modules/inventario';
import { getErrorMessage } from '@/lib/toast';
import { AssetFormFields, assetSchema, EMPTY_ASSET_VALUES, type AssetFormValues } from '@/modules/inventario/assets/components/asset-form-fields';

// Radix Select no admite value="" — mismo sentinel que ya usa BudgetForm.
const WHOLE_INSTITUTION_SENTINEL = '__whole_institution__';

export const Route = createFileRoute('/_authenticated/inventory/assets/new')({
  component: NewAssetPage,
});

function NewAssetPage() {
  const navigate = useNavigate();
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');

  useEffect(() => {
    if (!institutionId && institutions?.length) setInstitutionId(institutions[0]!.id);
  }, [institutions, institutionId]);

  const { data: branches } = useBranchesQuery(institutionId, !!institutionId);
  const createMutation = useCreateAssetMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { ...EMPTY_ASSET_VALUES, branchId: WHOLE_INSTITUTION_SENTINEL },
  });

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
      { onSuccess: (asset) => navigate({ to: '/inventory/assets/$assetId', params: { assetId: asset.id } }) },
    );
  };

  return (
    <div>
      <Link
        to="/inventory/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Activos
      </Link>

      {institutions && institutions.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="mt-4 rounded-2xl">
        <CardContent className="p-4">
          <h2 className="mb-1 text-sm font-semibold">Nuevo activo</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Equipo o mobiliario duradero — quién lo tiene, dónde está, en qué estado.
          </p>

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
