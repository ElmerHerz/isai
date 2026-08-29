import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useBranchesQuery } from '@/modules/general';
import { useAccountsQuery, useClosePeriodMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';

// Mismo sentinel que BudgetFormDialog — Radix Select no admite value="".
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

interface ClosePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

export function ClosePeriodDialog({ open, onOpenChange, institutionId }: ClosePeriodDialogProps) {
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
    reset,
    formState: { errors },
  } = useForm<ClosePeriodFormValues>({
    resolver: zodResolver(closePeriodSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
  }, [open, reset]);

  const onSubmit = (values: ClosePeriodFormValues) => {
    mutation.mutate(
      {
        institutionId,
        branchId: values.branchId === WHOLE_INSTITUTION_SENTINEL ? undefined : values.branchId,
        closedThroughDate: values.closedThroughDate,
        targetEquityAccountId: values.targetEquityAccountId,
        notes: values.notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar periodo</DialogTitle>
          <DialogDescription>
            Genera el asiento de cierre (mueve el resultado neto de Ingreso/Gasto a Patrimonio) y bloquea
            contabilizar o anular asientos fechados hasta esta fecha. Esta acción no se puede deshacer sin
            reabrir el periodo.
          </DialogDescription>
        </DialogHeader>

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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="targetEquityAccountId">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {equityAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Cerrando...' : 'Cerrar periodo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
