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
import { useCreateCountryMutation, useUpdateCountryMutation, useCurrenciesQuery } from '@/modules/general';
import type { Country } from '@isai/shared-types';

const NONE = '__none__';

const countrySchema = z.object({
  code: z
    .string()
    .length(2, 'Debe ser 2 letras')
    .regex(/^[A-Za-z]+$/, 'Solo letras')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  phonePrefix: z.string().max(5).optional(),
  defaultCurrencyCode: z.string().optional(),
});

type CountryFormValues = z.infer<typeof countrySchema>;

interface CountryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: Country;
}

export function CountryFormDialog({ open, onOpenChange, country }: CountryFormDialogProps) {
  const isEditing = !!country;
  const createMutation = useCreateCountryMutation();
  const updateMutation = useUpdateCountryMutation();
  const mutation = isEditing ? updateMutation : createMutation;
  const { data: currencies } = useCurrenciesQuery();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: { code: '', name: '', phonePrefix: '', defaultCurrencyCode: NONE },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: country?.code ?? '',
        name: country?.name ?? '',
        phonePrefix: country?.phonePrefix ?? '',
        defaultCurrencyCode: country?.defaultCurrencyCode ?? NONE,
      });
    }
  }, [open, country, reset]);

  const onSubmit = (values: CountryFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const defaultCurrencyCode =
      values.defaultCurrencyCode === NONE ? undefined : values.defaultCurrencyCode;

    if (isEditing) {
      updateMutation.mutate(
        { code: country.code, dto: { name: values.name, phonePrefix: values.phonePrefix, defaultCurrencyCode } },
        { onSuccess },
      );
    } else {
      createMutation.mutate({ ...values, defaultCurrencyCode }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar país' : 'Nuevo país'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del país.' : 'Agrega un país al catálogo global.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código ISO 3166-1 {isEditing && <span className="font-normal text-muted-foreground">(no editable)</span>}
            </Label>
            <Input id="code" placeholder="GT" maxLength={2} disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Guatemala" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phonePrefix">Prefijo telefónico (opcional)</Label>
            <Input id="phonePrefix" placeholder="+502" {...register('phonePrefix')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCurrencyCode">Moneda por defecto (opcional)</Label>
            <Controller
              name="defaultCurrencyCode"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="defaultCurrencyCode">
                    <SelectValue placeholder="Sin moneda por defecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin moneda por defecto</SelectItem>
                    {currencies?.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} — {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
