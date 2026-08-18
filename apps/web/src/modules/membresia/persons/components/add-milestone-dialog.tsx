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
import { useMilestoneTypesQuery, useCreatePersonMilestoneMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';

interface AddMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
}

export function AddMilestoneDialog({ open, onOpenChange, personId }: AddMilestoneDialogProps) {
  const { data: milestoneTypes } = useMilestoneTypesQuery();
  const mutation = useCreatePersonMilestoneMutation(personId);

  const [milestoneTypeId, setMilestoneTypeId] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setMilestoneTypeId('');
      setOccurredOn('');
      setNotes('');
    }
  }, [open]);

  const activeTypes = milestoneTypes?.filter((t) => t.isActive) ?? [];

  const onSubmit = () => {
    if (!milestoneTypeId || !occurredOn) return;
    mutation.mutate(
      { milestoneTypeId, occurredOn, notes: notes || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar hito espiritual</DialogTitle>
          <DialogDescription>Bautismo, membresía formal u otro hito de esta persona.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay tipos de hito configurados. Un Administrador puede crearlos desde{' '}
              <span className="font-medium">Catálogos → Tipos de hito</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="milestone-type">Tipo de hito</Label>
              <Select value={milestoneTypeId} onValueChange={setMilestoneTypeId}>
                <SelectTrigger id="milestone-type">
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
            <Label htmlFor="milestone-date">Fecha</Label>
            <DateInput id="milestone-date" value={occurredOn} onChange={setOccurredOn} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-notes">Notas (opcional)</Label>
            <Input id="milestone-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo registrar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!milestoneTypeId || !occurredOn || mutation.isPending}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
