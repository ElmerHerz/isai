import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import {
  usePersonsQuery,
  useFundCollectionDonorsQuery,
  useAddFundCollectionDonorMutation,
  useRemoveFundCollectionDonorMutation,
} from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { EventFundCollection } from '@isai/shared-types';

interface IdentifyDonorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  institutionId: string;
  collection: EventFundCollection;
}

function formatAmount(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

// Permite agregar varias líneas sin cerrarse — el tesorero suele identificar
// a varias personas seguidas después de un culto. La suma NUNCA puede
// superar el total de la colecta (validado también en el backend).
export function IdentifyDonorsDialog({ open, onOpenChange, eventId, institutionId, collection }: IdentifyDonorsDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const { data: persons } = usePersonsQuery(institutionId, canViewPersons);
  const {
    data: donors,
    isLoading: isDonorsLoading,
    isError: isDonorsError,
    refetch: refetchDonors,
  } = useFundCollectionDonorsQuery(eventId, collection.id, open);
  const addMutation = useAddFundCollectionDonorMutation(eventId, collection.id);
  const removeMutation = useRemoveFundCollectionDonorMutation(eventId, collection.id);

  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState('');

  const identifiedTotal = useMemo(
    () => (donors ?? []).reduce((sum, d) => sum + Number(d.amount), 0),
    [donors],
  );
  const remaining = Number(collection.amount) - identifiedTotal;

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = !!personId && isAmountValid && parsedAmount <= remaining + 0.001;

  const onAdd = () => {
    if (!canSubmit) return;
    addMutation.mutate(
      { personId, amount: parsedAmount },
      {
        onSuccess: () => {
          setPersonId('');
          setAmount('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Identificar donantes</DialogTitle>
          <DialogDescription>
            {collection.fundType.name} · Total de la colecta: {formatAmount(collection.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              remaining < 0.001 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }`}
          >
            Identificado: {formatAmount(identifiedTotal)} de {formatAmount(collection.amount)} — falta{' '}
            {formatAmount(Math.max(0, remaining))}
          </div>

          {isDonorsLoading && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {isDonorsError && (
            <QueryErrorState message="No se pudieron cargar los donantes." onRetry={() => refetchDonors()} />
          )}

          {!isDonorsLoading && !isDonorsError && (donors?.length ?? 0) > 0 && (
            <ul className="space-y-1.5">
              {donors!.map((donor) => (
                <li key={donor.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
                  <span className="truncate">
                    {donor.person.firstName} {donor.person.lastName}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium">{formatAmount(donor.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeMutation.mutate(donor.id)}
                      disabled={removeMutation.isPending}
                      aria-label="Quitar"
                      title="Quitar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {remaining > 0.001 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label htmlFor="identify-donor-person">Persona</Label>
                <Select value={personId} onValueChange={setPersonId} disabled={!canViewPersons}>
                  <SelectTrigger id="identify-donor-person">
                    <SelectValue placeholder="Selecciona una persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {persons?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="identify-donor-amount">Monto</Label>
                <Input
                  id="identify-donor-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {addMutation.isError && (
                <p className="text-sm text-destructive">
                  {getErrorMessage(addMutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
                </p>
              )}

              <Button type="button" onClick={onAdd} disabled={!canSubmit || addMutation.isPending} className="w-full">
                {addMutation.isPending ? 'Agregando...' : 'Agregar donante'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
