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
import { useCreatePrivilegeTypeMutation, useUpdatePrivilegeTypeMutation } from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';
import type { PrivilegeType } from '@isai/shared-types';

// MAYUSCULAS_CON_GUION_BAJO, sin acentos — mismo criterio que
// milestone-type-form-dialog.tsx.
function toTypeCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const privilegeTypeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, 'Solo letras, números y guion bajo')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

type PrivilegeTypeFormValues = z.infer<typeof privilegeTypeSchema>;

interface PrivilegeTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: PrivilegeType;
  /** Solo para superadmin creando: a qué tenant pertenece el tipo nuevo. */
  tenantId?: string;
}

export function PrivilegeTypeFormDialog({ open, onOpenChange, type, tenantId }: PrivilegeTypeFormDialogProps) {
  const isEditing = !!type;
  const createMutation = useCreatePrivilegeTypeMutation();
  const updateMutation = useUpdatePrivilegeTypeMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<PrivilegeTypeFormValues>({
    resolver: zodResolver(privilegeTypeSchema),
    defaultValues: { code: '', name: '' },
  });

  const name = watch('name');

  useEffect(() => {
    if (open) {
      reset({ code: type?.code ?? '', name: type?.name ?? '' });
    }
  }, [open, type, reset]);

  useEffect(() => {
    if (!isEditing && name && !dirtyFields.code) {
      setValue('code', toTypeCode(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing, dirtyFields.code]);

  const onSubmit = (values: PrivilegeTypeFormValues) => {
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateMutation.mutate({ id: type.id, dto: { name: values.name } }, { onSuccess });
    } else {
      createMutation.mutate({ code: values.code, name: values.name, tenantId }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tipo de privilegio' : 'Nuevo tipo de privilegio'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza el nombre.' : 'Se agrega solo para tu organización — otros tenants no lo verán.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código{' '}
              {isEditing ? (
                <span className="font-normal text-muted-foreground">(no editable)</span>
              ) : (
                <span className="font-normal text-muted-foreground">(se autocompleta, puedes cambiarlo)</span>
              )}
            </Label>
            <Input id="code" placeholder="ALABANZAS" disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Alabanzas" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
