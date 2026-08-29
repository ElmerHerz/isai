import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useBranchesQuery } from '@/modules/general';
import { useCreateBudgetMutation, useUpdateBudgetMutation } from '@/modules/finanzas';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { Budget } from '@isai/shared-types';

// Mismo sentinel que UNGROUPED_SENTINEL en event-form-dialog.tsx — Radix
// Select no admite value="" en un SelectItem, así que "toda la institución"
// necesita un valor propio distinto de "" para poder distinguirse de
// "todavía no elegido nada".
const WHOLE_INSTITUTION_SENTINEL = '__whole_institution__';

const budgetSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  branchId: z.string().min(1, 'Selecciona una opción'),
  periodStart: z.string().min(1, 'La fecha de inicio es requerida'),
  periodEnd: z.string().min(1, 'La fecha de fin es requerida'),
  notes: z.string().optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

const EMPTY_VALUES: BudgetFormValues = {
  name: '',
  branchId: WHOLE_INSTITUTION_SENTINEL,
  periodStart: '',
  periodEnd: '',
  notes: '',
};

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  budget?: Budget;
}

export function BudgetFormDialog({ open, onOpenChange, institutionId, budget }: BudgetFormDialogProps) {
  const isEditing = !!budget;
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const createMutation = useCreateBudgetMutation();
  const updateMutation = useUpdateBudgetMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        budget
          ? {
              name: budget.name,
              branchId: budget.branchId ?? WHOLE_INSTITUTION_SENTINEL,
              periodStart: budget.periodStart.slice(0, 10),
              periodEnd: budget.periodEnd.slice(0, 10),
              notes: budget.notes ?? '',
            }
          : EMPTY_VALUES,
      );
    }
  }, [open, budget, reset]);

  const onSubmit = (values: BudgetFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const branchId = values.branchId === WHOLE_INSTITUTION_SENTINEL ? undefined : values.branchId;

    if (isEditing) {
      updateMutation.mutate(
        {
          id: budget.id,
          dto: {
            name: values.name,
            periodStart: values.periodStart,
            periodEnd: values.periodEnd,
            notes: values.notes || undefined,
          },
        },
        { onSuccess },
      );
    } else {
      createMutation.mutate(
        {
          institutionId,
          branchId,
          name: values.name,
          periodStart: values.periodStart,
          periodEnd: values.periodEnd,
          notes: values.notes || undefined,
        },
        { onSuccess },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del presupuesto.' : 'Un monto mensual por cuenta, para comparar contra lo real.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Presupuesto 2027" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="branchId">Alcance</Label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WHOLE_INSTITUTION_SENTINEL}>Toda la institución</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Desde</Label>
              <Controller
                name="periodStart"
                control={control}
                render={({ field }) => <DateInput id="periodStart" value={field.value} onChange={field.onChange} />}
              />
              {errors.periodStart && <p className="text-sm text-destructive">{errors.periodStart.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Hasta</Label>
              <Controller
                name="periodEnd"
                control={control}
                render={({ field }) => <DateInput id="periodEnd" value={field.value} onChange={field.onChange} />}
              />
              {errors.periodEnd && <p className="text-sm text-destructive">{errors.periodEnd.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
