import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  useTenantSettingsQuery,
  useUpdateTenantSettingsMutation,
  useCurrenciesQuery,
  useCountriesQuery,
  useLanguagesQuery,
} from '@/modules/general';
import { useMeQuery } from '@/modules/security';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';

export const Route = createFileRoute('/_authenticated/general/settings')({
  component: SettingsPage,
});

const settingsSchema = z.object({
  currencyCode: z.string().min(1, 'Selecciona una moneda'),
  countryCode: z.string().min(1, 'Selecciona un país'),
  languageCode: z.string().min(1, 'Selecciona un idioma'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function SettingsPage() {
  const { data: me, isLoading: isMeLoading } = useMeQuery();
  // Esta pantalla es la configuración DEL tenant activo — un superadmin sin
  // tenant seleccionado (tenantId null en el JWT) no tiene "su" configuración,
  // así que ni siquiera se llama a /tenants/me (evita el toast de error 400
  // que tira el backend, ver useTenantSettingsQuery).
  const isSuperadmin = !!me && !me.tenantId;
  const { data: tenant, isLoading: isTenantLoading } = useTenantSettingsQuery(!!me?.tenantId);
  const updateMutation = useUpdateTenantSettingsMutation();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrenciesQuery();
  const { data: countries, isLoading: isCountriesLoading } = useCountriesQuery();
  const { data: languages, isLoading: isLanguagesLoading } = useLanguagesQuery();

  // Los 3 catálogos deben estar listos ANTES de mostrar el formulario — si
  // el tenant llega primero y el Select se monta con su valor ya elegido
  // pero sin las opciones todavía, Radix nunca vuelve a mostrar la etiqueta
  // aunque las opciones lleguen un instante después (se ve vacío hasta que
  // el usuario abre el desplegable a mano). Por suerte de orden de red esto
  // a veces "se veía bien" y a veces no — nunca fue confiable.
  const isLoading =
    isMeLoading || (!isSuperadmin && (isTenantLoading || isCurrenciesLoading || isCountriesLoading || isLanguagesLoading));

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { currencyCode: '', countryCode: '', languageCode: '' },
  });

  useEffect(() => {
    if (tenant) {
      reset({
        currencyCode: tenant.currencyCode,
        countryCode: tenant.countryCode,
        languageCode: tenant.languageCode,
      });
    }
  }, [tenant, reset]);

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(values);
  };

  return (
    <div>
      <PageHeader
        icon={SettingsIcon}
        title="Configuración"
        description={tenant ? `Ajustes generales de ${tenant.name}.` : 'Ajustes generales del tenant.'}
      />

      <Card className="mt-6 max-w-xl rounded-2xl">
        <CardContent className="p-6">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

          {!isLoading && isSuperadmin && (
            <p className="text-sm text-muted-foreground">
              Esta configuración es por tenant. Como superadmin no tienes un tenant seleccionado, así que no aplica
              para tu sesión — entra como usuario de un tenant para verla o editarla.
            </p>
          )}

          {!isLoading && !isSuperadmin && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="countryCode">País</Label>
                <Controller
                  name="countryCode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="countryCode">
                        <SelectValue placeholder="Selecciona un país" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries?.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.countryCode && (
                  <p className="text-sm text-destructive">{errors.countryCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyCode">Moneda</Label>
                <Controller
                  name="currencyCode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="currencyCode">
                        <SelectValue placeholder="Selecciona una moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies?.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} — {currency.name} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.currencyCode && (
                  <p className="text-sm text-destructive">{errors.currencyCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="languageCode">Idioma</Label>
                <Controller
                  name="languageCode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="languageCode">
                        <SelectValue placeholder="Selecciona un idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages?.map((language) => (
                          <SelectItem key={language.code} value={language.code}>
                            {language.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.languageCode && (
                  <p className="text-sm text-destructive">{errors.languageCode.message}</p>
                )}
              </div>

              {updateMutation.isError && (
                <p className="text-sm text-destructive">
                  {(updateMutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'No se pudo guardar. Verifica los datos e intenta de nuevo.'}
                </p>
              )}
              {updateMutation.isSuccess && (
                <p className="text-sm text-emerald-600">Configuración guardada.</p>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
