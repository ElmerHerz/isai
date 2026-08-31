import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useFundTypesQuery, useCreateEventFundCollectionMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';

interface AddFundCollectionPanelProps {
  eventId: string;
  onDone: () => void;
}

export function AddFundCollectionPanel({ eventId, onDone }: AddFundCollectionPanelProps) {
  const { data: fundTypes } = useFundTypesQuery();
  const mutation = useCreateEventFundCollectionMutation(eventId);

  const [fundTypeId, setFundTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const activeTypes = fundTypes?.filter((t) => t.isActive) ?? [];
  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const onSubmit = () => {
    if (!fundTypeId || !isAmountValid) return;
    mutation.mutate({ fundTypeId, amount: parsedAmount, notes: notes || undefined }, { onSuccess: onDone });
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Registrar fondo recogido</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

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

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!fundTypeId || !isAmountValid || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
