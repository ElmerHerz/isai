import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { usePersonsQuery, useGroupMembersQuery, useAddGroupMembersMutation } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { normalizeText } from '@/lib/normalize-text';

interface AddGroupMemberPanelProps {
  groupId: string;
  institutionId: string;
  onDone: () => void;
}

// Panel inline — no modal. Se eligen una o varias personas mientras la lista
// de miembros actuales sigue visible en la misma pantalla.
export function AddGroupMemberPanel({ groupId, institutionId, onDone }: AddGroupMemberPanelProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId, canViewPersons);
  const { data: currentMembers, isLoading: isMembersLoading } = useGroupMembersQuery(groupId);
  const isLoading = (canViewPersons && isPersonsLoading) || isMembersLoading;
  const mutation = useAddGroupMembersMutation(groupId);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentMemberIds = useMemo(
    () => new Set((currentMembers ?? []).map((m) => m.personId)),
    [currentMembers],
  );

  const available = useMemo(() => {
    const term = normalizeText(search.trim());
    return (persons ?? [])
      .filter((p) => !currentMemberIds.has(p.id))
      .filter((p) => !term || normalizeText(`${p.firstName} ${p.lastName}`).includes(term));
  }, [persons, currentMemberIds, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = () => {
    mutation.mutate(
      [...selectedIds].map((personId) => ({
        personId,
        role: role || undefined,
        joinedAt: joinedAt || undefined,
      })),
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agregar miembros</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="member-search">Buscar</Label>
          <Input
            id="member-search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border">
          {!canViewPersons && (
            <p className="p-3 text-sm text-muted-foreground">No tienes permiso para ver personas.</p>
          )}
          {canViewPersons && isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
          {canViewPersons && !isLoading && available.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              {persons?.length ? 'No hay personas disponibles con ese nombre.' : 'No hay personas registradas todavía.'}
            </p>
          )}
          {canViewPersons && !isLoading && available.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={selectedIds.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span>
                {p.firstName} {p.lastName}
              </span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role">Rol dentro del grupo (opcional)</Label>
            <Input id="role" placeholder="Miembro, líder..." value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="joinedAt">Fecha de ingreso (opcional, hoy por defecto)</Label>
            <DateInput id="joinedAt" value={joinedAt} onChange={setJoinedAt} />
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={selectedIds.size === 0 || mutation.isPending}>
            {mutation.isPending ? 'Agregando...' : `Agregar${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
