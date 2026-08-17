import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { useCreateBranchMutation, useUpdateBranchMutation } from '@/modules/general';
import { getErrorMessage } from '@/lib/toast';

const branchSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  branch?: { id: string; name: string };
}

export function BranchFormDialog({
  open,
  onOpenChange,
  institutionId,
  branch,
}: BranchFormDialogProps) {
  const isEditing = !!branch;
  const createMutation = useCreateBranchMutation(institutionId);
  const updateMutation = useUpdateBranchMutation(institutionId);
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: branch?.name ?? '' });
    }
  }, [open, branch, reset]);

  const onSubmit = (values: BranchFormValues) => {
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateMutation.mutate({ id: branch.id, dto: values }, { onSuccess });
    } else {
      createMutation.mutate(values, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza el nombre de la sucursal.' : 'Agrega una sucursal a esta institución.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Sucursal Norte" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
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
