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
import { useUpdateApprovalRouteMutation } from '../use-update-approval-route.mutation';
import { getErrorMessage } from '@/lib/toast';
import type { ApprovalRoute } from '@isai/shared-types';

interface EditApprovalRouteAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: ApprovalRoute;
}

export function EditApprovalRouteAmountDialog({ open, onOpenChange, route }: EditApprovalRouteAmountDialogProps) {
  const mutation = useUpdateApprovalRouteMutation();
  const [minAmount, setMinAmount] = useState('');

  useEffect(() => {
    if (open) setMinAmount(route.minAmount);
  }, [open, route.minAmount]);

  const parsedAmount = Number(minAmount);
  const isAmountValid = minAmount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;

  const onSubmit = () => {
    if (!isAmountValid) return;
    mutation.mutate({ id: route.id, dto: { minAmount: parsedAmount } }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar monto mínimo</DialogTitle>
          <DialogDescription>{route.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-approval-route-amount">Monto mínimo</Label>
            <Input
              id="edit-approval-route-amount"
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!isAmountValid || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
