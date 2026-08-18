import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Coins,
  FileText,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  useEventQuery,
  useDeleteEventMutation,
  useEventPrivilegesQuery,
  useRemoveEventPrivilegeMutation,
  useEventFundCollectionsQuery,
  useRemoveEventFundCollectionMutation,
  usePostFundCollectionToLedgerMutation,
} from '@/modules/membresia';
import { useInstitutionsQuery } from '@/modules/general';
import { EventFormDialog } from '@/modules/membresia/events/components/event-form-dialog';
import { AttendanceEditor } from '@/modules/membresia/events/components/attendance-editor';
import { AddEventPrivilegeDialog } from '@/modules/membresia/events/components/add-event-privilege-dialog';
import { AddFundCollectionDialog } from '@/modules/membresia/events/components/add-fund-collection-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import { toTimeInputValue } from '@/lib/format-time';
import type { EventPrivilege, EventFundCollection } from '@isai/shared-types';

const CHURCH_INSTITUTION_TYPE = 'church';

export const Route = createFileRoute('/_authenticated/membership/events/$eventId')({
  component: EventDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function scopeLabel(event: { group?: { name: string } | null; branch?: { name: string } | null }) {
  if (event.group) return event.group.name;
  if (event.branch) return event.branch.name;
  return 'Toda la institución';
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, isError, refetch } = useEventQuery(eventId);
  const { data: institutions } = useInstitutionsQuery();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteEventMutation(event?.institutionId ?? '');

  const [addPrivilegeOpen, setAddPrivilegeOpen] = useState(false);
  const [removingPrivilege, setRemovingPrivilege] = useState<EventPrivilege | null>(null);
  const {
    data: privileges,
    isLoading: isPrivilegesLoading,
    isError: isPrivilegesError,
    refetch: refetchPrivileges,
  } = useEventPrivilegesQuery(eventId);
  const removePrivilegeMutation = useRemoveEventPrivilegeMutation(eventId);

  const [addFundOpen, setAddFundOpen] = useState(false);
  const [removingFund, setRemovingFund] = useState<EventFundCollection | null>(null);
  const {
    data: fundCollections,
    isLoading: isFundCollectionsLoading,
    isError: isFundCollectionsError,
    refetch: refetchFundCollections,
  } = useEventFundCollectionsQuery(eventId);
  const removeFundCollectionMutation = useRemoveEventFundCollectionMutation(eventId);
  const [postingFund, setPostingFund] = useState<EventFundCollection | null>(null);
  const postFundCollectionMutation = usePostFundCollectionToLedgerMutation(eventId);

  if (isError) {
    return <QueryErrorState message="No se pudo cargar el evento." onRetry={() => refetch()} />;
  }

  if (isLoading || !event) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  // Privilegios de culto y fondos recogidos solo aplican a instituciones
  // tipo iglesia — el backend también lo valida (defensa en profundidad),
  // esto es solo para no mostrar las secciones donde no aplica.
  const isChurch = institutions?.find((i) => i.id === event.institutionId)?.typeCode === CHURCH_INSTITUTION_TYPE;
  const fundTotal = (fundCollections ?? []).reduce((sum, fc) => sum + Number(fc.amount), 0);

  const timeRange = [toTimeInputValue(event.startTime), toTimeInputValue(event.endTime)]
    .filter(Boolean)
    .join(' – ');

  const fields = [
    { label: 'Tipo', value: event.eventType.name, icon: Tag },
    { label: 'Fecha', value: formatDate(event.eventDate), icon: Calendar },
    ...(timeRange ? [{ label: 'Hora', value: timeRange, icon: Clock }] : []),
    { label: 'Alcance', value: scopeLabel(event), icon: MapPin },
    ...(event.notes ? [{ label: 'Notas', value: event.notes, icon: FileText }] : []),
  ];

  return (
    <div>
      <Link
        to="/membership/attendance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Asistencia
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={Calendar}
          title={event.title}
          description={[event.eventType.name, formatDate(event.eventDate)].filter(Boolean).join(' · ')}
        />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 space-y-6">
        {/* Barra horizontal en vez de una tarjeta angosta con mucho espacio
            vacío — "Datos del evento" es poca información, no necesita su
            propia columna al lado de la asistencia (que sí es densa). En
            móvil se apila: primero los datos, luego las acciones. */}
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
              {fields.map((field) => (
                <div key={field.label} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <field.icon className="h-3.5 w-3.5 shrink-0" />
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 break-words font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1 sm:flex-none">
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
              <Button variant="delete" size="sm" onClick={() => setDeleteOpen(true)} className="flex-1 sm:flex-none">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ClipboardCheck className="h-4 w-4" />
              Asistencia
            </h2>
            <AttendanceEditor event={event} />
          </CardContent>
        </Card>

        {isChurch && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Star className="h-4 w-4" />
                    Privilegios
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setAddPrivilegeOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agregar
                  </Button>
                </div>

                {isPrivilegesLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                )}

                {isPrivilegesError && (
                  <QueryErrorState message="No se pudieron cargar los privilegios." onRetry={() => refetchPrivileges()} />
                )}

                {!isPrivilegesLoading && !isPrivilegesError && privileges?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no se han asignado privilegios.</p>
                )}

                <ul className="space-y-2">
                  {privileges?.map((privilege) => (
                    <li
                      key={privilege.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {privilege.person.firstName} {privilege.person.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{privilege.privilegeType.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setRemovingPrivilege(privilege)}
                        aria-label="Quitar"
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Coins className="h-4 w-4" />
                    Fondos recogidos
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setAddFundOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agregar
                  </Button>
                </div>

                {isFundCollectionsLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                )}

                {isFundCollectionsError && (
                  <QueryErrorState
                    message="No se pudieron cargar los fondos."
                    onRetry={() => refetchFundCollections()}
                  />
                )}

                {!isFundCollectionsLoading && !isFundCollectionsError && fundCollections?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Todavía no se han registrado fondos.</p>
                )}

                <ul className="space-y-2">
                  {fundCollections?.map((fc) => (
                    <li key={fc.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{fc.fundType.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium">${Number(fc.amount).toFixed(2)}</span>
                        {fc.journalEntryId ? (
                          <span
                            className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            title="Ya tiene asiento contable"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Contabilizado
                          </span>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPostingFund(fc)}
                              aria-label="Contabilizar"
                              title="Contabilizar"
                            >
                              <Landmark className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRemovingFund(fc)}
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {(fundCollections?.length ?? 0) > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
                    <span>Total</span>
                    <span>${fundTotal.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        institutionId={event.institutionId}
        event={event}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar evento"
        description={`Esto elimina "${event.title}" y toda la asistencia registrada para ese evento. No se puede deshacer.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(event.id, {
            onSuccess: () => navigate({ to: '/membership/attendance' }),
          });
        }}
      />

      {isChurch && (
        <>
          <AddEventPrivilegeDialog
            open={addPrivilegeOpen}
            onOpenChange={setAddPrivilegeOpen}
            eventId={event.id}
            institutionId={event.institutionId}
          />
          <ConfirmDialog
            open={!!removingPrivilege}
            onOpenChange={(open) => !open && setRemovingPrivilege(null)}
            title="Quitar privilegio"
            confirmLabel="Quitar"
            pendingLabel="Quitando..."
            description={
              removingPrivilege
                ? `Esto quita el privilegio "${removingPrivilege.privilegeType.name}" de ${removingPrivilege.person.firstName} ${removingPrivilege.person.lastName} en este evento.`
                : ''
            }
            isPending={removePrivilegeMutation.isPending}
            onConfirm={() => {
              if (!removingPrivilege) return;
              removePrivilegeMutation.mutate(removingPrivilege.id, {
                onSuccess: () => setRemovingPrivilege(null),
              });
            }}
          />

          <AddFundCollectionDialog open={addFundOpen} onOpenChange={setAddFundOpen} eventId={event.id} />
          <ConfirmDialog
            open={!!removingFund}
            onOpenChange={(open) => !open && setRemovingFund(null)}
            title="Eliminar registro de fondo"
            description={
              removingFund
                ? `Esto elimina el registro de "${removingFund.fundType.name}" por $${Number(removingFund.amount).toFixed(2)}. No se puede deshacer.`
                : ''
            }
            isPending={removeFundCollectionMutation.isPending}
            onConfirm={() => {
              if (!removingFund) return;
              removeFundCollectionMutation.mutate(removingFund.id, { onSuccess: () => setRemovingFund(null) });
            }}
          />

          <ConfirmDialog
            open={!!postingFund}
            onOpenChange={(open) => !open && setPostingFund(null)}
            title="Contabilizar colecta"
            confirmLabel="Contabilizar"
            pendingLabel="Contabilizando..."
            description={
              postingFund
                ? `Esto genera el asiento contable de "${postingFund.fundType.name}" por $${Number(postingFund.amount).toFixed(2)} (debe Caja, haber la cuenta de ingreso del fondo). No se puede deshacer ni volver a contabilizar la misma colecta.`
                : ''
            }
            isPending={postFundCollectionMutation.isPending}
            onConfirm={() => {
              if (!postingFund) return;
              postFundCollectionMutation.mutate(postingFund.id, { onSuccess: () => setPostingFund(null) });
            }}
          />
        </>
      )}
    </div>
  );
}
