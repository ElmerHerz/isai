import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { DateInput } from '@/components/ui/date-input';
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateProjectExpenseMutation } from '@/modules/proyectos';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';

const EXPENSE_ACCOUNT_TYPE = 'EXPENSE';

interface AddExpensePanelProps {
  projectId: string;
  onDone: () => void;
}

export function AddExpensePanel({ projectId, onDone }: AddExpensePanelProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const expenseAccounts = accounts?.filter((a) => a.accountType.code === EXPENSE_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const mutation = useCreateProjectExpenseMutation(projectId);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredAt, setIncurredAt] = useState(todayLocalDateInput());
  const [notes, setNotes] = useState('');

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!accountId && isAmountValid && !!incurredAt;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { accountId, amount: parsedAmount, incurredAt, notes: notes || undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Registrar gasto</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {expenseAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay cuentas de gasto configuradas. Créala primero desde{' '}
            <span className="font-medium">Finanzas → Catálogo de Cuentas</span> (tipo "Gasto").
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="expense-account">Cuenta de gasto</Label>
            <Combobox
              id="expense-account"
              options={expenseAccounts}
              value={accountId}
              onChange={setAccountId}
              getOptionValue={(account) => account.id}
              getOptionLabel={(account) => `${account.code} · ${account.name}`}
              placeholder="Selecciona una cuenta"
              searchPlaceholder="Buscar por código o nombre..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Monto</Label>
            <Input
              id="expense-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="12500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date">Fecha</Label>
            <DateInput id="expense-date" value={incurredAt} onChange={setIncurredAt} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-notes">Notas (opcional)</Label>
          <Input id="expense-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo registrar. Verifica los datos e intenta de nuevo.')}
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
