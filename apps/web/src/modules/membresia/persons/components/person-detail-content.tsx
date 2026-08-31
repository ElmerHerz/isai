import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Award,
  Calendar,
  Church,
  CreditCard,
  FileText,
  Heart,
  LayoutGrid,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  usePersonQuery,
  usePersonGroupsQuery,
  usePersonPositionsQuery,
  usePersonRelationshipsQuery,
  useRemovePersonRelationshipMutation,
  usePersonMilestonesQuery,
  useRemovePersonMilestoneMutation,
  useUpdatePersonMutation,
} from '@/modules/membresia';
import { useInstitutionsQuery } from '@/modules/general';
import { AddFamilyRelationshipPanel } from './add-family-relationship-panel';
import { AddMilestonePanel } from './add-milestone-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { PersonRelationshipItem, PersonMilestone } from '@isai/shared-types';

const CHURCH_INSTITUTION_TYPE = 'church';

function isCurrentPosition(position: { termEnd?: string | null }) {
  if (!position.termEnd) return true;
  return new Date(position.termEnd) >= new Date(new Date().toDateString());
}

interface PersonDetailContentProps {
  personId: string;
}

// Cuerpo del detalle de una persona (datos + Grupos + Cargos + Núcleo
// familiar + Hitos espirituales) — sin PageHeader ni enlace de regreso, para
// que $personId.tsx (la única forma de verlo, en cualquier viewport) lo
// pueda envolver con su propio encabezado sin duplicar la lógica de datos.
export function PersonDetailContent({ personId }: PersonDetailContentProps) {
  const navigate = useNavigate();
  const { data: person, isLoading, isError, refetch } = usePersonQuery(personId);
  const { data: institutions } = useInstitutionsQuery();
  const { data: groups, isLoading: isGroupsLoading, isError: isGroupsError, refetch: refetchGroups } =
    usePersonGroupsQuery(personId);
  const { data: positions, isLoading: isPositionsLoading, isError: isPositionsError, refetch: refetchPositions } =
    usePersonPositionsQuery(personId);
  const {
    data: relationships,
    isLoading: isRelationshipsLoading,
    isError: isRelationshipsError,
    refetch: refetchRelationships,
  } = usePersonRelationshipsQuery(personId);
  const removeRelationshipMutation = useRemovePersonRelationshipMutation(personId);
  const {
    data: milestones,
    isLoading: isMilestonesLoading,
    isError: isMilestonesError,
    refetch: refetchMilestones,
  } = usePersonMilestonesQuery(personId);
  const removeMilestoneMutation = useRemovePersonMilestoneMutation(personId);
  const updateMutation = useUpdatePersonMutation();

  const [addFamilyOpen, setAddFamilyOpen] = useState(false);
  const [removingRelationship, setRemovingRelationship] = useState<PersonRelationshipItem | null>(null);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [removingMilestone, setRemovingMilestone] = useState<PersonMilestone | null>(null);

  if (isError) {
    return <QueryErrorState message="No se pudo cargar la persona." onRetry={() => refetch()} />;
  }

  if (isLoading || !person) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Los hitos espirituales solo aplican a instituciones tipo iglesia — el
  // backend también lo valida (defensa en profundidad), esto es solo para
  // no mostrar la sección donde no aplica.
  const isChurch = institutions?.find((i) => i.id === person.institutionId)?.typeCode === CHURCH_INSTITUTION_TYPE;

  const fields = [
    { label: 'Tipo', value: person.personType.name, icon: Tag },
    { label: 'Sucursal', value: person.branch?.name ?? 'Toda la institución', icon: MapPin },
    ...(person.phone ? [{ label: 'Teléfono', value: person.phone, icon: Phone }] : []),
    ...(person.email ? [{ label: 'Correo', value: person.email, icon: Mail }] : []),
    ...(person.identityDocument ? [{ label: 'Documento', value: person.identityDocument, icon: CreditCard }] : []),
    ...(person.birthDate ? [{ label: 'Nacimiento', value: formatDate(person.birthDate), icon: Calendar }] : []),
    ...(person.joinDate ? [{ label: 'Ingreso', value: formatDate(person.joinDate), icon: Calendar }] : []),
    ...(person.addressLine || person.city
      ? [{ label: 'Dirección', value: [person.addressLine, person.city].filter(Boolean).join(', '), icon: MapPin }]
      : []),
    ...(person.notes ? [{ label: 'Notas', value: person.notes, icon: FileText }] : []),
  ];

  return (
    <div className="space-y-6">
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
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={person.isActive}
                onCheckedChange={(checked) => updateMutation.mutate({ id: person.id, dto: { isActive: checked } })}
                disabled={updateMutation.isPending}
                aria-label={person.isActive ? 'Desactivar persona' : 'Activar persona'}
                title={person.isActive ? 'Desactivar' : 'Activar'}
              />
              <span className="text-xs text-muted-foreground">{person.isActive ? 'Activa' : 'Inactiva'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/membership/persons/$personId/edit', params: { personId: person.id } })}
              className="flex-1 sm:flex-none"
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <LayoutGrid className="h-4 w-4" />
              Grupos
            </h2>

            {isGroupsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isGroupsError && (
              <QueryErrorState message="No se pudieron cargar los grupos." onRetry={() => refetchGroups()} />
            )}

            {!isGroupsLoading && !isGroupsError && groups?.length === 0 && (
              <p className="text-sm text-muted-foreground">Esta persona no pertenece a ningún grupo actualmente.</p>
            )}

            <ul className="space-y-2">
              {groups?.map((membership) => (
                <li key={membership.id} className="rounded-lg border px-3 py-2">
                  <p className="truncate text-sm font-medium">{membership.group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {membership.group.groupType.name} · desde {formatDate(membership.joinedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Award className="h-4 w-4" />
              Cargos
            </h2>

            {isPositionsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isPositionsError && (
              <QueryErrorState message="No se pudieron cargar los cargos." onRetry={() => refetchPositions()} />
            )}

            {!isPositionsLoading && !isPositionsError && positions?.length === 0 && (
              <p className="text-sm text-muted-foreground">Esta persona no tiene cargos de directiva.</p>
            )}

            <ul className="space-y-2">
              {positions?.map((gp) => {
                const current = isCurrentPosition(gp);
                return (
                  <li key={gp.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{gp.position.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {gp.group.name} · {formatDate(gp.termStart)} — {formatDate(gp.termEnd)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        current
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {current ? 'Vigente' : 'Finalizado'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className={cn('grid gap-6', isChurch ? 'lg:grid-cols-2' : '')}>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Heart className="h-4 w-4" />
                Núcleo familiar
              </h2>
              {!addFamilyOpen && (
                <Button variant="outline" size="sm" onClick={() => setAddFamilyOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar
                </Button>
              )}
            </div>

            {addFamilyOpen && (
              <AddFamilyRelationshipPanel
                personId={person.id}
                institutionId={person.institutionId}
                onDone={() => setAddFamilyOpen(false)}
              />
            )}

            {isRelationshipsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isRelationshipsError && (
              <QueryErrorState message="No se pudo cargar el núcleo familiar." onRetry={() => refetchRelationships()} />
            )}

            {!isRelationshipsLoading && !isRelationshipsError && relationships?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no se han agregado familiares.</p>
            )}

            <ul className="space-y-2">
              {relationships?.map((relationship) => (
                <li
                  key={relationship.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {relationship.relatedPerson.firstName} {relationship.relatedPerson.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{relationship.relationshipType.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setRemovingRelationship(relationship)}
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

        {isChurch && (
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Church className="h-4 w-4" />
                  Hitos espirituales
                </h2>
                {!addMilestoneOpen && (
                  <Button variant="outline" size="sm" onClick={() => setAddMilestoneOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agregar
                  </Button>
                )}
              </div>

              {addMilestoneOpen && (
                <AddMilestonePanel personId={person.id} onDone={() => setAddMilestoneOpen(false)} />
              )}

              {isMilestonesLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {isMilestonesError && (
                <QueryErrorState message="No se pudieron cargar los hitos." onRetry={() => refetchMilestones()} />
              )}

              {!isMilestonesLoading && !isMilestonesError && milestones?.length === 0 && (
                <p className="text-sm text-muted-foreground">Todavía no se han registrado hitos.</p>
              )}

              <ul className="space-y-2">
                {milestones?.map((milestone) => (
                  <li key={milestone.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{milestone.milestoneType.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatDate(milestone.occurredOn)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setRemovingMilestone(milestone)}
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!removingRelationship}
        onOpenChange={(open) => !open && setRemovingRelationship(null)}
        title="Quitar familiar"
        confirmLabel="Quitar"
        pendingLabel="Quitando..."
        description={
          removingRelationship
            ? `Esto quita a ${removingRelationship.relatedPerson.firstName} ${removingRelationship.relatedPerson.lastName} del núcleo familiar de esta persona.`
            : ''
        }
        isPending={removeRelationshipMutation.isPending}
        onConfirm={() => {
          if (!removingRelationship) return;
          removeRelationshipMutation.mutate(removingRelationship.id, {
            onSuccess: () => setRemovingRelationship(null),
          });
        }}
      />

      {isChurch && (
        <>
          <ConfirmDialog
            open={!!removingMilestone}
            onOpenChange={(open) => !open && setRemovingMilestone(null)}
            title="Eliminar hito"
            description={
              removingMilestone
                ? `Esto elimina el hito "${removingMilestone.milestoneType.name}" del ${formatDate(removingMilestone.occurredOn)}. No se puede deshacer.`
                : ''
            }
            isPending={removeMilestoneMutation.isPending}
            onConfirm={() => {
              if (!removingMilestone) return;
              removeMilestoneMutation.mutate(removingMilestone.id, { onSuccess: () => setRemovingMilestone(null) });
            }}
          />
        </>
      )}
    </div>
  );
}
