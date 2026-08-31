import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useAccountsQuery, useAddBudgetLineMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';

// Presupuesto puede llevar cuentas de Ingreso o de Gasto — a diferencia de
// AddExpensePanel (solo EXPENSE), acá no se restringe por tipo, ambos lados
// del presupuesto se manejan en la misma pantalla.
const BUDGETABLE_TYPES = ['INCOME', 'EXPENSE'];

interface AddBudgetLinePanelProps {
  budgetId: string;
  existingAccountIds: string[];
  onDone: () => void;
}

export function AddBudgetLinePanel({ budgetId, existingAccountIds, onDone }: AddBudgetLinePanelProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const availableAccounts =
    accounts?.filter(
      (a) => BUDGETABLE_TYPES.includes(a.accountType.code) && a.allowsTransactions && !existingAccountIds.includes(a.id),
    ) ?? [];
  const mutation = useAddBudgetLineMutation(budgetId);

  const [accountId, setAccountId] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [notes, setNotes] = useState('');

  const parsedAmount = Number(monthlyAmount);
  const isAmountValid = monthlyAmount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const canSubmit = !!accountId && isAmountValid;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { accountId, monthlyAmount: parsedAmount, notes: notes || undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agregar línea</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {availableAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay más cuentas disponibles para agregar (o ya están todas en este presupuesto).
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="budget-line-account">Cuenta</Label>
            <Combobox
              id="budget-line-account"
              options={availableAccounts}
              value={accountId}
              onChange={setAccountId}
              getOptionValue={(account) => account.id}
              getOptionLabel={(account) => `${account.code} · ${account.name}`}
              placeholder="Selecciona una cuenta"
              searchPlaceholder="Buscar por código o nombre..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="budget-line-amount">Monto mensual</Label>
          <Input
            id="budget-line-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="500.00"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-line-notes">Notas (opcional)</Label>
          <Input id="budget-line-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
