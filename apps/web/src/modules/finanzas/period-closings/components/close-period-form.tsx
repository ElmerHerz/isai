import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { DateInput } from '@/components/ui/date-input';
import { useBranchesQuery } from '@/modules/general';
import { useAccountsQuery, useClosePeriodMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';

// Mismo sentinel que BudgetForm — Radix Select no admite value="".
const WHOLE_INSTITUTION_SENTINEL = '__whole_institution__';

const closePeriodSchema = z.object({
  branchId: z.string().min(1, 'Selecciona una opción'),
  closedThroughDate: z.string().min(1, 'La fecha de cierre es requerida'),
  targetEquityAccountId: z.string().min(1, 'Selecciona la cuenta de Patrimonio destino'),
  notes: z.string().optional(),
});

type ClosePeriodFormValues = z.infer<typeof closePeriodSchema>;

const EMPTY_VALUES: ClosePeriodFormValues = {
  branchId: WHOLE_INSTITUTION_SENTINEL,
  closedThroughDate: '',
  targetEquityAccountId: '',
  notes: '',
};

interface ClosePeriodFormProps {
  institutionId: string;
  onSaved: () => void;
}

export function ClosePeriodForm({ institutionId, onSaved }: ClosePeriodFormProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: accounts } = useAccountsQuery();
  const equityAccounts = accounts?.filter((a) => a.accountType.code === 'EQUITY') ?? [];
  const mutation = useClosePeriodMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClosePeriodFormValues>({
    resolver: zodResolver(closePeriodSchema),
    defaultValues: EMPTY_VALUES,
  });

  const onSubmit = (values: ClosePeriodFormValues) => {
    mutation.mutate(
      {
        institutionId,
        branchId: values.branchId === WHOLE_INSTITUTION_SENTINEL ? undefined : values.branchId,
        closedThroughDate: values.closedThroughDate,
        targetEquityAccountId: values.targetEquityAccountId,
        notes: values.notes || undefined,
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">Cerrar periodo</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Genera el asiento de cierre (mueve el resultado neto de Ingreso/Gasto a Patrimonio) y bloquea
          contabilizar o anular asientos fechados hasta esta fecha. Esta acción no se puede deshacer sin
          reabrir el periodo.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchId">Alcance</Label>
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WHOLE_INSTITUTION_SENTINEL}>Toda la institución</SelectItem>
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
            <Label htmlFor="closedThroughDate">Cerrar hasta</Label>
            <Controller
              name="closedThroughDate"
              control={control}
              render={({ field }) => <DateInput id="closedThroughDate" value={field.value} onChange={field.onChange} />}
            />
            {errors.closedThroughDate && <p className="text-sm text-destructive">{errors.closedThroughDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetEquityAccountId">Cuenta de Patrimonio destino</Label>
            <Controller
              name="targetEquityAccountId"
              control={control}
              render={({ field }) => (
                <Combobox
                  id="targetEquityAccountId"
                  options={equityAccounts}
                  value={field.value}
                  onChange={field.onChange}
                  getOptionValue={(account) => account.id}
                  getOptionLabel={(account) => `${account.code} — ${account.name}`}
                  placeholder="Selecciona una cuenta"
                  searchPlaceholder="Buscar por código o nombre..."
                />
              )}
            />
            {errors.targetEquityAccountId && (
              <p className="text-sm text-destructive">{errors.targetEquityAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error, 'No se pudo cerrar el periodo.')}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Cerrando...' : 'Cerrar periodo'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
