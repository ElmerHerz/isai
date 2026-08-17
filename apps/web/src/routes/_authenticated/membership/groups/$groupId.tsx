import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Award, LayoutGrid, Pencil, Plus, Users, XCircle } from 'lucide-react';
import {
  useGroupQuery,
  useGroupMembersQuery,
  useRemoveGroupMemberMutation,
  usePositionsQuery,
  useUpdatePositionMutation,
} from '@/modules/membresia';
import { AddGroupMemberDialog } from '@/modules/membresia/groups/components/add-group-member-dialog';
import { PositionFormDialog } from '@/modules/membresia/positions/components/position-form-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { GroupPositionWithRelations, GroupMemberWithPerson } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/groups/$groupId')({
  component: GroupDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function isCurrentPosition(position: GroupPositionWithRelations) {
  if (!position.termEnd) return true;
  return new Date(position.termEnd) >= new Date(new Date().toDateString());
}

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const { data: group, isLoading: isGroupLoading, isError: isGroupError, refetch: refetchGroup } = useGroupQuery(groupId);
  const { data: members, isLoading: isMembersLoading, isError: isMembersError, refetch: refetchMembers } = useGroupMembersQuery(groupId);
  const removeMutation = useRemoveGroupMemberMutation(groupId);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<GroupMemberWithPerson | null>(null);

  const {
    data: positions,
    isLoading: isPositionsLoading,
    isError: isPositionsError,
    refetch: refetchPositions,
  } = usePositionsQuery(group?.institutionId ?? '', groupId);
  const updatePositionMutation = useUpdatePositionMutation();
  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<GroupPositionWithRelations | null>(null);
  const [finalizingPosition, setFinalizingPosition] = useState<GroupPositionWithRelations | null>(null);

  if (isGroupError) {
    return <QueryErrorState message="No se pudo cargar el grupo." onRetry={() => refetchGroup()} />;
  }

  if (isGroupLoading || !group) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div>
      <Link
        to="/membership/groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Grupos
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={LayoutGrid}
          title={group.name}
          description={[group.groupType.name, group.branch?.name].filter(Boolean).join(' · ')}
        />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <LayoutGrid className="h-4 w-4" />
              Datos del grupo
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{group.groupType.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sucursal</dt>
                <dd>{group.branch?.name ?? 'Toda la institución'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Líder</dt>
                <dd>{group.leader ? `${group.leader.firstName} ${group.leader.lastName}` : 'Sin asignar'}</dd>
              </div>
              {group.description && (
                <div>
                  <dt className="text-muted-foreground">Descripción</dt>
                  <dd>{group.description}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 border-t pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Award className="h-4 w-4" />
                  Directiva
                </h2>
                <Button variant="outline" size="sm" onClick={() => setAddPositionOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Asignar cargo
                </Button>
              </div>

              {isPositionsLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {isPositionsError && (
                <QueryErrorState message="No se pudo cargar la directiva." onRetry={() => refetchPositions()} />
              )}

              {!isPositionsLoading && !isPositionsError && positions?.length === 0 && (
                <p className="text-sm text-muted-foreground">Este grupo todavía no tiene directiva asignada.</p>
              )}

              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {positions?.map((gp) => {
                  const current = isCurrentPosition(gp);
                  return (
                    <li key={gp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {gp.person.firstName} {gp.person.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {gp.position.name} · {formatDate(gp.termStart)} — {formatDate(gp.termEnd)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            current
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                          )}
                        >
                          {current ? 'Vigente' : 'Finalizado'}
                        </span>
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => setEditingPosition(gp)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {current && (
                          <Button
                            variant="delete"
                            size="icon"
                            onClick={() => setFinalizingPosition(gp)}
                            aria-label="Finalizar cargo"
                            title="Finalizar cargo (hoy)"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" />
                Miembros actuales
              </h2>
              <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>

            {isMembersLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isMembersError && (
              <QueryErrorState message="No se pudieron cargar los miembros." onRetry={() => refetchMembers()} />
            )}

            {!isMembersLoading && !isMembersError && members?.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay miembros en este grupo.</p>
            )}

            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {members?.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.person.firstName} {member.person.lastName}
                    </p>
                    {member.role && <p className="truncate text-xs text-muted-foreground">{member.role}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setRemovingMember(member)}>
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      <AddGroupMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        groupId={groupId}
        institutionId={group.institutionId}
      />

      <PositionFormDialog
        open={addPositionOpen}
        onOpenChange={setAddPositionOpen}
        institutionId={group.institutionId}
        defaultGroupId={groupId}
      />
      {editingPosition && (
        <PositionFormDialog
          open={!!editingPosition}
          onOpenChange={(open) => !open && setEditingPosition(null)}
          institutionId={group.institutionId}
          position={editingPosition}
        />
      )}

      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title="Quitar del grupo"
        confirmLabel="Quitar"
        pendingLabel="Quitando..."
        description={
          removingMember
            ? `Esto cierra la membresía de ${removingMember.person.firstName} ${removingMember.person.lastName} en este grupo (queda en el historial, pero deja de contar como miembro actual).`
            : ''
        }
        isPending={removeMutation.isPending}
        onConfirm={() => {
          if (!removingMember) return;
          removeMutation.mutate(removingMember.id, { onSuccess: () => setRemovingMember(null) });
        }}
      />

      <ConfirmDialog
        open={!!finalizingPosition}
        onOpenChange={(open) => !open && setFinalizingPosition(null)}
        title="Finalizar cargo"
        confirmLabel="Finalizar"
        pendingLabel="Finalizando..."
        description={
          finalizingPosition
            ? `Esto cierra el cargo de ${finalizingPosition.position.name} de ${finalizingPosition.person.firstName} ${finalizingPosition.person.lastName} con fecha de hoy.`
            : ''
        }
        isPending={updatePositionMutation.isPending}
        onConfirm={() => {
          if (!finalizingPosition) return;
          updatePositionMutation.mutate(
            { id: finalizingPosition.id, dto: { termEnd: new Date().toISOString().slice(0, 10) } },
            { onSuccess: () => setFinalizingPosition(null) },
          );
        }}
      />
    </div>
  );
}
