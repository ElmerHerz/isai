import { useEffect, useState } from 'react';
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
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateProjectExpenseMutation } from '@/modules/proyectos';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';

const EXPENSE_ACCOUNT_TYPE = 'EXPENSE';

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddExpenseDialog({ open, onOpenChange, projectId }: AddExpenseDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const expenseAccounts = accounts?.filter((a) => a.accountType.code === EXPENSE_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const mutation = useCreateProjectExpenseMutation(projectId);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredAt, setIncurredAt] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAccountId('');
      setAmount('');
      setIncurredAt(todayLocalDateInput());
      setNotes('');
    }
  }, [open]);

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!accountId && isAmountValid && !!incurredAt;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { accountId, amount: parsedAmount, incurredAt, notes: notes || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>Dinero que sale del proyecto (ej. la compra del equipo).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {expenseAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay cuentas de gasto configuradas. Créala primero desde{' '}
              <span className="font-medium">Finanzas → Catálogo de Cuentas</span> (tipo "Gasto").
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="expense-account">Cuenta de gasto</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="expense-account">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
