import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBranchMutation, useUpdateBranchMutation } from '@/modules/general';
import { getErrorMessage } from '@/lib/toast';

const branchSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormProps {
  institutionId: string;
  branch?: { id: string; name: string };
  onSaved: () => void;
  onCancel: () => void;
}

// Panel inline — solo un campo, no amerita su propia ruta. Vive dentro del
// detalle de la institución (agregar/editar sucursal) y también dentro del
// listado global de sucursales (editar).
export function BranchForm({ institutionId, branch, onSaved, onCancel }: BranchFormProps) {
  const isEditing = !!branch;
  const createMutation = useCreateBranchMutation(institutionId);
  const updateMutation = useUpdateBranchMutation(institutionId);
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: branch?.name ?? '' },
  });

  const onSubmit = (values: BranchFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: branch.id, dto: values }, { onSuccess: onSaved });
    } else {
      createMutation.mutate(values, { onSuccess: onSaved });
    }
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isEditing ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

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

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
