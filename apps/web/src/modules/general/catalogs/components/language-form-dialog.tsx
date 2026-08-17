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
import { useCreateLanguageMutation, useUpdateLanguageMutation } from '@/modules/general';
import type { Language } from '@isai/shared-types';

const languageSchema = z.object({
  code: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(10)
    .regex(/^[a-zA-Z-]+$/, 'Solo letras y guion (ej. es o es-GT)')
    .transform((v) => v.toLowerCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

type LanguageFormValues = z.infer<typeof languageSchema>;

interface LanguageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
}

export function LanguageFormDialog({ open, onOpenChange, language }: LanguageFormDialogProps) {
  const isEditing = !!language;
  const createMutation = useCreateLanguageMutation();
  const updateMutation = useUpdateLanguageMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: { code: '', name: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ code: language?.code ?? '', name: language?.name ?? '' });
    }
  }, [open, language, reset]);

  const onSubmit = (values: LanguageFormValues) => {
    const onSuccess = () => onOpenChange(false);

    if (isEditing) {
      updateMutation.mutate({ code: language.code, dto: { name: values.name } }, { onSuccess });
    } else {
      createMutation.mutate(values, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar idioma' : 'Nuevo idioma'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza el nombre del idioma.' : 'Agrega un idioma al catálogo global.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código {isEditing && <span className="font-normal text-muted-foreground">(no editable)</span>}
            </Label>
            <Input id="code" placeholder="es" maxLength={10} disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Español" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'No se pudo guardar. Verifica los datos e intenta de nuevo.'}
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
