import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
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

interface LanguageFormProps {
  language?: Language;
  onSaved: () => void;
}

export function LanguageForm({ language, onSaved }: LanguageFormProps) {
  const isEditing = !!language;
  const createMutation = useCreateLanguageMutation();
  const updateMutation = useUpdateLanguageMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: { code: language?.code ?? '', name: language?.name ?? '' },
  });

  const onSubmit = (values: LanguageFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ code: language.code, dto: { name: values.name } }, { onSuccess: onSaved });
    } else {
      createMutation.mutate(values, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar idioma' : 'Nuevo idioma'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza el nombre del idioma.' : 'Agrega un idioma al catálogo global.'}
        </p>

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

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
