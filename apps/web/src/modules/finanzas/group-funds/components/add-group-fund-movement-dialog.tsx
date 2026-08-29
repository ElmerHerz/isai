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
import { useAccountsQuery, useCreateGroupFundMovementMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';

interface AddGroupFundMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  type: 'income' | 'expense';
}

const ACCOUNT_TYPE_BY_MOVEMENT: Record<'income' | 'expense', string> = {
  income: 'INCOME',
  expense: 'EXPENSE',
};

// La sucursal ya no decide qué Caja debitar (eso lo resuelve la cuenta de
// caja propia del grupo, Group.cashAccountId) — por eso este diálogo ya no
// pide sucursal, a diferencia de una versión anterior de esta pantalla.
export function AddGroupFundMovementDialog({ open, onOpenChange, groupId, type }: AddGroupFundMovementDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const accountTypeCode = ACCOUNT_TYPE_BY_MOVEMENT[type];
  const eligibleAccounts = accounts?.filter((a) => a.accountType.code === accountTypeCode && a.allowsTransactions) ?? [];
  const mutation = useCreateGroupFundMovementMutation(groupId);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [movementDate, setMovementDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAccountId('');
      setAmount('');
      setMovementDate(todayLocalDateInput());
      setNotes('');
    }
  }, [open]);

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!accountId && isAmountValid && !!movementDate;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      {
        type,
        accountId,
        amount: parsedAmount,
        movementDate,
        notes: notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const title = type === 'income' ? 'Registrar ingreso' : 'Registrar gasto';
  const description = type === 'income'
    ? 'Dinero que entra al fondo del grupo (ej. una ofrenda semanal).'
    : 'Dinero que sale del fondo del grupo (ej. una compra).';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {eligibleAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay cuentas de {type === 'income' ? 'ingreso' : 'gasto'} configuradas. Créala primero desde{' '}
              <span className="font-medium">Finanzas → Catálogo de Cuentas</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fund-movement-account">Cuenta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="fund-movement-account">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((account) => (
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
              <Label htmlFor="fund-movement-amount">Monto</Label>
              <Input
                id="fund-movement-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="45.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-movement-date">Fecha</Label>
              <DateInput id="fund-movement-date" value={movementDate} onChange={setMovementDate} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fund-movement-notes">Notas (opcional)</Label>
            <Input id="fund-movement-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
