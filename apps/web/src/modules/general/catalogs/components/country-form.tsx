import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
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

interface CountryFormProps {
  country?: Country;
  onSaved: () => void;
}

// Formulario propio (sin modal) para crear/editar un país — vive en
// general/catalogs/countries/new.tsx y .../$code.tsx.
export function CountryForm({ country, onSaved }: CountryFormProps) {
  const isEditing = !!country;
  const createMutation = useCreateCountryMutation();
  const updateMutation = useUpdateCountryMutation();
  const mutation = isEditing ? updateMutation : createMutation;
  const { data: currencies } = useCurrenciesQuery();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      code: country?.code ?? '',
      name: country?.name ?? '',
      phonePrefix: country?.phonePrefix ?? '',
      defaultCurrencyCode: country?.defaultCurrencyCode ?? NONE,
    },
  });

  const onSubmit = (values: CountryFormValues) => {
    const defaultCurrencyCode = values.defaultCurrencyCode === NONE ? undefined : values.defaultCurrencyCode;

    if (isEditing) {
      updateMutation.mutate(
        { code: country.code, dto: { name: values.name, phonePrefix: values.phonePrefix, defaultCurrencyCode } },
        { onSuccess: onSaved },
      );
    } else {
      createMutation.mutate({ ...values, defaultCurrencyCode }, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar país' : 'Nuevo país'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos del país.' : 'Agrega un país al catálogo global.'}
        </p>

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
