import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MapPin, Clock, Plus } from 'lucide-react';
import {
  useBranchQuery,
  useBranchAddressQuery,
  useUpsertBranchAddressMutation,
  useBranchSchedulesQuery,
  useDeleteBranchScheduleMutation,
  useCountriesQuery,
  useTenantSettingsQuery,
} from '@/modules/general';
import { useMeQuery } from '@/modules/security';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { LocationMap } from '@/components/ui/location-map';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScheduleFormPanel,
  DAYS,
} from '@/modules/general/branches/components/schedule-form-panel';
import { getErrorMessage } from '@/lib/toast';
import type { BranchSchedule } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/general/branches/$branchId')({
  component: BranchDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const addressSchema = z.object({
  countryCode: z.string().min(1, 'Selecciona un país'),
  stateProvince: z.string().max(100).optional(),
  city: z.string().min(1, 'La ciudad es requerida').max(100),
  line1: z.string().min(1, 'La dirección es requerida').max(200),
  line2: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

function dayLabel(dayOfWeek: number | null) {
  return DAYS.find((d) => d.value === dayOfWeek)?.label ?? '—';
}

// "1970-01-01T14:00:00.000Z" -> "02:00 PM" — mismo formato 12h que ya
// muestra nativamente el <input type="time"> del diálogo, para que la
// franja guardada se lea igual que como se capturó.
function timeLabel(iso: string) {
  const hours24 = Number(iso.slice(11, 13));
  const minutes = iso.slice(14, 16);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`;
}

function BranchDetailPage() {
  const { branchId } = Route.useParams();
  const {
    data: branch,
    isLoading: isBranchLoading,
    isError: isBranchError,
    refetch: refetchBranch,
  } = useBranchQuery(branchId);
  const {
    data: address,
    isLoading: isAddressLoading,
    isError: isAddressError,
    refetch: refetchAddress,
  } = useBranchAddressQuery(branchId);
  const { data: countries } = useCountriesQuery();
  const upsertAddressMutation = useUpsertBranchAddressMutation(branchId);
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !!currentUser && !currentUser.tenantId;
  // Solo se usa para prellenar el país por defecto de una dirección nueva —
  // un superadmin no tiene "su" tenant (GET /tenants/me exige uno), así que
  // para él simplemente no hay default que prellenar, no es un error real.
  const { data: tenant } = useTenantSettingsQuery(!isSuperadmin);

  const {
    data: schedules,
    isLoading: isSchedulesLoading,
    isError: isSchedulesError,
    refetch: refetchSchedules,
  } = useBranchSchedulesQuery(branchId);
  const deleteScheduleMutation = useDeleteBranchScheduleMutation(branchId);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BranchSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<BranchSchedule | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      countryCode: '',
      stateProvince: '',
      city: '',
      line1: '',
      line2: '',
      postalCode: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  useEffect(() => {
    if (address) {
      reset({
        countryCode: address.countryCode,
        stateProvince: address.stateProvince ?? '',
        city: address.city,
        line1: address.line1,
        line2: address.line2 ?? '',
        postalCode: address.postalCode ?? '',
        latitude: address.latitude ?? undefined,
        longitude: address.longitude ?? undefined,
      });
    } else if (address === null && tenant) {
      // Sin dirección todavía — precarga el país con el default del tenant
      // (Configuración) en vez de dejar el select vacío.
      reset({
        countryCode: tenant.countryCode,
        stateProvince: '',
        city: '',
        line1: '',
        line2: '',
        postalCode: '',
        latitude: undefined,
        longitude: undefined,
      });
    }
  }, [address, tenant, reset]);

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const onSubmitAddress = (values: AddressFormValues) => {
    upsertAddressMutation.mutate(values);
  };

  if (isBranchError) {
    return <QueryErrorState message="No se pudo cargar la sucursal." onRetry={() => refetchBranch()} />;
  }

  if (isBranchLoading || !branch) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div>
      <Link
        to="/general/branches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Sucursales
      </Link>

      <div className="mt-3">
        <PageHeader icon={MapPin} title={branch.name} description={branch.institution.name} />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              Ubicación
            </h2>

            {isAddressError ? (
              <QueryErrorState message="No se pudo cargar la ubicación." onRetry={() => refetchAddress()} />
            ) : isAddressLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <form onSubmit={handleSubmit(onSubmitAddress)} className="space-y-4">
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" placeholder="Ciudad de Guatemala" {...register('city')} />
                    {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stateProvince">Departamento (opcional)</Label>
                    <Input id="stateProvince" placeholder="Guatemala" {...register('stateProvince')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line1">Dirección</Label>
                  <Input id="line1" placeholder="5a avenida 10-25, zona 1" {...register('line1')} />
                  {errors.line1 && <p className="text-sm text-destructive">{errors.line1.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line2">Referencia (opcional)</Label>
                  <Input id="line2" placeholder="Frente al parque central" {...register('line2')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código postal (opcional)</Label>
                  <Input id="postalCode" placeholder="01001" {...register('postalCode')} />
                </div>

                <div className="space-y-2">
                  <Label>Ubicación en el mapa (opcional)</Label>
                  <LocationMap
                    latitude={latitude}
                    longitude={longitude}
                    onChange={({ latitude: lat, longitude: lng }) => {
                      setValue('latitude', lat, { shouldDirty: true });
                      setValue('longitude', lng, { shouldDirty: true });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitud (opcional)</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="14.6349"
                      {...register('latitude', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitud (opcional)</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-90.5069"
                      {...register('longitude', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {upsertAddressMutation.isError && (
                  <p className="text-sm text-destructive">
                    {getErrorMessage(upsertAddressMutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
                  </p>
                )}
                {upsertAddressMutation.isSuccess && (
                  <p className="text-sm text-emerald-600">Ubicación guardada.</p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={upsertAddressMutation.isPending}>
                    {upsertAddressMutation.isPending ? 'Guardando...' : 'Guardar ubicación'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                Horario
              </h2>
              {!scheduleFormOpen && !editingSchedule && (
                <Button variant="outline" size="sm" onClick={() => setScheduleFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva franja
                </Button>
              )}
            </div>

            {scheduleFormOpen && (
              <ScheduleFormPanel branchId={branchId} onDone={() => setScheduleFormOpen(false)} />
            )}
            {editingSchedule && (
              <ScheduleFormPanel
                branchId={branchId}
                schedule={editingSchedule}
                onDone={() => setEditingSchedule(null)}
              />
            )}

            {isSchedulesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isSchedulesError && (
              <QueryErrorState message="No se pudieron cargar los horarios." onRetry={() => refetchSchedules()} />
            )}

            {!isSchedulesLoading && !isSchedulesError && schedules?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay franjas de horario.</p>
            )}

            <ul className="space-y-2">
              {schedules?.map((schedule) => (
                <li
                  key={schedule.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {schedule.label || schedule.scheduleType.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dayLabel(schedule.dayOfWeek)} · {timeLabel(schedule.startTime)}
                      {schedule.endTime ? ` – ${timeLabel(schedule.endTime)}` : ''} · {schedule.scheduleType.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setScheduleFormOpen(false);
                        setEditingSchedule(schedule);
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingSchedule(schedule)}>
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={!!deletingSchedule}
        onOpenChange={(open) => !open && setDeletingSchedule(null)}
        title="Eliminar franja de horario"
        description={
          deletingSchedule
            ? `Esto elimina "${deletingSchedule.label || deletingSchedule.scheduleType.name}" de esta sucursal. No se puede deshacer.`
            : ''
        }
        isPending={deleteScheduleMutation.isPending}
        onConfirm={() => {
          if (!deletingSchedule) return;
          deleteScheduleMutation.mutate(deletingSchedule.id, { onSuccess: () => setDeletingSchedule(null) });
        }}
      />
    </div>
  );
}
