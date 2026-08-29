import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useBranchesQuery } from '@/modules/general';
import { useSuppliersQuery, useCreatePurchaseMutation } from '@/modules/comercio';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';
import type { Purchase } from '@isai/shared-types';

const PAYMENT_METHOD_NONE = '__none__';

const purchaseSchema = z.object({
  branchId: z.string().min(1, 'Selecciona una sucursal'),
  supplierId: z.string().min(1, 'Selecciona un proveedor'),
  purchaseDate: z.string().min(1, 'La fecha es requerida'),
  supplierDocumentNumber: z.string().max(50).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

const DEFAULT_VALUES: PurchaseFormValues = {
  branchId: '',
  supplierId: '',
  purchaseDate: todayLocalDateInput(),
  supplierDocumentNumber: '',
  paymentMethod: PAYMENT_METHOD_NONE,
  notes: '',
};

interface PurchaseHeaderFormProps {
  institutionId: string;
  onCreated: (purchase: Purchase) => void;
}

// Encabezado de una compra nueva — sin modal, vive directo en la pantalla de
// "Nueva compra" (routes/store/purchases/new.tsx). Al guardar, la compra ya
// existe en la base y la misma pantalla pasa a mostrar PurchaseWorkspace
// para agregar líneas, todo sin navegar a otra ruta.
export function PurchaseHeaderForm({ institutionId, onCreated }: PurchaseHeaderFormProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: suppliers } = useSuppliersQuery();
  const mutation = useCreatePurchaseMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = (values: PurchaseFormValues) => {
    mutation.mutate(
      {
        institutionId,
        branchId: values.branchId,
        supplierId: values.supplierId,
        purchaseDate: values.purchaseDate,
        supplierDocumentNumber: values.supplierDocumentNumber || undefined,
        paymentMethod:
          values.paymentMethod && values.paymentMethod !== PAYMENT_METHOD_NONE
            ? (values.paymentMethod as 'cash' | 'transfer' | 'credit')
            : undefined,
        notes: values.notes || undefined,
      },
      { onSuccess: (purchase) => onCreated(purchase) },
    );
  };

  return (
    <Card className="mt-6 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-4 text-sm font-semibold">Encabezado de la compra</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal</Label>
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierId">Proveedor</Label>
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="supplierId">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha</Label>
              <Controller
                name="purchaseDate"
                control={control}
                render={({ field }) => <DateInput id="purchaseDate" value={field.value} onChange={field.onChange} />}
              />
              {errors.purchaseDate && <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de pago (opcional)</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PAYMENT_METHOD_NONE}>Sin especificar</SelectItem>
                      <SelectItem value="cash">Contado</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierDocumentNumber">Número de factura del proveedor (opcional)</Label>
            <Input id="supplierDocumentNumber" {...register('supplierDocumentNumber')} />
            {errors.supplierDocumentNumber && (
              <p className="text-sm text-destructive">{errors.supplierDocumentNumber.message}</p>
            )}
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
              {mutation.isPending ? 'Guardando...' : 'Crear compra y agregar líneas'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
