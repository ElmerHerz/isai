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
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateProjectMutation, useUpdateProjectMutation } from '@/modules/proyectos';
import { getErrorMessage } from '@/lib/toast';
import type { Project } from '@isai/shared-types';

const INCOME_ACCOUNT_TYPE = 'INCOME';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  description: z.string().optional(),
  branchId: z.string().min(1, 'Selecciona la sucursal cuya caja recibe el dinero'),
  goalAmount: z.string().min(1, 'La meta es requerida'),
  targetDate: z.string().optional(),
  incomeAccountId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const EMPTY_VALUES: ProjectFormValues = {
  name: '',
  description: '',
  branchId: '',
  goalAmount: '',
  targetDate: '',
  incomeAccountId: '',
};

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  project?: Project;
}

export function ProjectFormDialog({ open, onOpenChange, institutionId, project }: ProjectFormDialogProps) {
  const isEditing = !!project;
  const { data: branches } = useBranchesQuery(institutionId);
  const { data: accounts } = useAccountsQuery();
  const incomeAccounts = accounts?.filter((a) => a.accountType.code === INCOME_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              name: project.name,
              description: project.description ?? '',
              branchId: project.branchId,
              goalAmount: project.goalAmount,
              targetDate: project.targetDate?.slice(0, 10) ?? '',
              incomeAccountId: project.incomeAccountId ?? '',
            }
          : EMPTY_VALUES,
      );
    }
  }, [open, project, reset]);

  const onSubmit = (values: ProjectFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const dto = {
      name: values.name,
      description: values.description || undefined,
      goalAmount: Number(values.goalAmount),
      targetDate: values.targetDate || undefined,
      incomeAccountId: values.incomeAccountId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: project.id, dto }, { onSuccess });
    } else {
      createMutation.mutate({ ...dto, institutionId, branchId: values.branchId }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos de la campaña.' : 'Crea una campaña de recaudación con meta y fecha.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Equipo de sonido" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" {...register('description')} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                La sucursal cuya Caja recibe el dinero — aunque el proyecto sea para toda la iglesia.
              </p>
              {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goalAmount">Meta</Label>
              <Input id="goalAmount" type="number" min="0" step="0.01" placeholder="13000" {...register('goalAmount')} />
              {errors.goalAmount && <p className="text-sm text-destructive">{errors.goalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Fecha objetivo (opcional)</Label>
              <Controller
                name="targetDate"
                control={control}
                render={({ field }) => <DateInput id="targetDate" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeAccountId">Cuenta de ingreso (opcional)</Label>
            <Controller
              name="incomeAccountId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="incomeAccountId">
                    <SelectValue placeholder="Sin configurar — bloquea Contabilizar hasta que se elija" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              A qué cuenta se contabilizan los aportes de este proyecto. Se puede configurar después.
            </p>
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
