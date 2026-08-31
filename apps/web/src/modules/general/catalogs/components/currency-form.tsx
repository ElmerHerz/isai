import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCurrencyMutation, useUpdateCurrencyMutation } from '@/modules/general';
import type { Currency } from '@isai/shared-types';

const currencySchema = z.object({
  code: z
    .string()
    .length(3, 'Debe ser 3 letras')
    .regex(/^[A-Za-z]+$/, 'Solo letras')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'El nombre es requerido').max(100),
  symbol: z.string().min(1, 'El símbolo es requerido').max(5),
  decimalPlaces: z.coerce.number().int().min(0).max(4),
});

type CurrencyFormValues = z.infer<typeof currencySchema>;

interface CurrencyFormProps {
  currency?: Currency;
  onSaved: () => void;
}

export function CurrencyForm({ currency, onSaved }: CurrencyFormProps) {
  const isEditing = !!currency;
  const createMutation = useCreateCurrencyMutation();
  const updateMutation = useUpdateCurrencyMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: currency?.code ?? '',
      name: currency?.name ?? '',
      symbol: currency?.symbol ?? '',
      decimalPlaces: currency?.decimalPlaces ?? 2,
    },
  });

  const onSubmit = (values: CurrencyFormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { code: currency.code, dto: { name: values.name, symbol: values.symbol, decimalPlaces: values.decimalPlaces } },
        { onSuccess: onSaved },
      );
    } else {
      createMutation.mutate(values, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar moneda' : 'Nueva moneda'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos de la moneda.' : 'Agrega una moneda al catálogo global.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código ISO 4217 {isEditing && <span className="font-normal text-muted-foreground">(no editable)</span>}
            </Label>
            <Input id="code" placeholder="EUR" maxLength={3} disabled={isEditing} {...register('code')} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Euro" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="symbol">Símbolo</Label>
              <Input id="symbol" placeholder="€" {...register('symbol')} />
              {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimalPlaces">Decimales</Label>
              <Input id="decimalPlaces" type="number" min={0} max={4} {...register('decimalPlaces')} />
              {errors.decimalPlaces && (
                <p className="text-sm text-destructive">{errors.decimalPlaces.message}</p>
              )}
            </div>
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
