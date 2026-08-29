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
import { useAccountsQuery, useAddBudgetLineMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';

// Presupuesto puede llevar cuentas de Ingreso o de Gasto — a diferencia de
// AddExpenseDialog (solo EXPENSE), acá no se restringe por tipo, ambos
// lados del presupuesto se manejan en la misma pantalla.
const BUDGETABLE_TYPES = ['INCOME', 'EXPENSE'];

interface AddBudgetLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  existingAccountIds: string[];
}

export function AddBudgetLineDialog({ open, onOpenChange, budgetId, existingAccountIds }: AddBudgetLineDialogProps) {
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

  useEffect(() => {
    if (open) {
      setAccountId('');
      setMonthlyAmount('');
      setNotes('');
    }
  }, [open]);

  const parsedAmount = Number(monthlyAmount);
  const isAmountValid = monthlyAmount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const canSubmit = !!accountId && isAmountValid;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { accountId, monthlyAmount: parsedAmount, notes: notes || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar línea</DialogTitle>
          <DialogDescription>Una cuenta y cuánto se planea mover ahí cada mes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay más cuentas disponibles para agregar (o ya están todas en este presupuesto).
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="budget-line-account">Cuenta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="budget-line-account">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
