import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { DateInput } from '@/components/ui/date-input';
import { useAccountsQuery, useCreateGroupFundMovementMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';

interface AddGroupFundMovementPanelProps {
  groupId: string;
  type: 'income' | 'expense';
  onDone: () => void;
}

const ACCOUNT_TYPE_BY_MOVEMENT: Record<'income' | 'expense', string> = {
  income: 'INCOME',
  expense: 'EXPENSE',
};

// La sucursal ya no decide qué Caja debitar (eso lo resuelve la cuenta de
// caja propia del grupo, Group.cashAccountId) — por eso este panel ya no
// pide sucursal, a diferencia de una versión anterior de esta pantalla.
export function AddGroupFundMovementPanel({ groupId, type, onDone }: AddGroupFundMovementPanelProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewAccounts = permissions.includes('finance.account.view');
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const accountTypeCode = ACCOUNT_TYPE_BY_MOVEMENT[type];
  const eligibleAccounts = accounts?.filter((a) => a.accountType.code === accountTypeCode && a.allowsTransactions) ?? [];
  const mutation = useCreateGroupFundMovementMutation(groupId);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [movementDate, setMovementDate] = useState(todayLocalDateInput());
  const [notes, setNotes] = useState('');

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!accountId && isAmountValid && !!movementDate;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { type, accountId, amount: parsedAmount, movementDate, notes: notes || undefined },
      { onSuccess: onDone },
    );
  };

  const title = type === 'income' ? 'Registrar ingreso' : 'Registrar gasto';
  const description = type === 'income'
    ? 'Dinero que entra al fondo del grupo (ej. una ofrenda semanal).'
    : 'Dinero que sale del fondo del grupo (ej. una compra).';

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {eligibleAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay cuentas de {type === 'income' ? 'ingreso' : 'gasto'} configuradas. Créala primero desde{' '}
            <span className="font-medium">Finanzas → Catálogo de Cuentas</span>.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="fund-movement-account">Cuenta</Label>
            <Combobox
              id="fund-movement-account"
              options={eligibleAccounts}
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

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
