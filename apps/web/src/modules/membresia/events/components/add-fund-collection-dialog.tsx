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
import { useFundTypesQuery, useCreateEventFundCollectionMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';

interface AddFundCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function AddFundCollectionDialog({ open, onOpenChange, eventId }: AddFundCollectionDialogProps) {
  const { data: fundTypes } = useFundTypesQuery();
  const mutation = useCreateEventFundCollectionMutation(eventId);

  const [fundTypeId, setFundTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setFundTypeId('');
      setAmount('');
      setNotes('');
    }
  }, [open]);

  const activeTypes = fundTypes?.filter((t) => t.isActive) ?? [];
  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const onSubmit = () => {
    if (!fundTypeId || !isAmountValid) return;
    mutation.mutate(
      { fundTypeId, amount: parsedAmount, notes: notes || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar fondo recogido</DialogTitle>
          <DialogDescription>Monto recogido por tipo de fondo en este culto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay tipos de fondo configurados. Un Administrador puede crearlos desde{' '}
              <span className="font-medium">Catálogos → Fondos</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fund-type">Tipo de fondo</Label>
              <Select value={fundTypeId} onValueChange={setFundTypeId}>
                <SelectTrigger id="fund-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fund-amount">Monto</Label>
            <Input
              id="fund-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fund-notes">Notas (opcional)</Label>
            <Input id="fund-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo registrar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!fundTypeId || !isAmountValid || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
