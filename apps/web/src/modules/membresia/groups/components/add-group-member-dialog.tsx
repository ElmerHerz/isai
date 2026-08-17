import { useEffect, useMemo, useState } from 'react';
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
import { usePersonsQuery, useGroupMembersQuery, useAddGroupMembersMutation } from '@/modules/membresia';

interface AddGroupMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  institutionId: string;
}

export function AddGroupMemberDialog({ open, onOpenChange, groupId, institutionId }: AddGroupMemberDialogProps) {
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId);
  const { data: currentMembers, isLoading: isMembersLoading } = useGroupMembersQuery(groupId);
  const isLoading = isPersonsLoading || isMembersLoading;
  const mutation = useAddGroupMembersMutation(groupId);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSearch('');
      setRole('');
      setJoinedAt('');
      setSelectedIds(new Set());
    }
  }, [open]);

  const currentMemberIds = useMemo(
    () => new Set((currentMembers ?? []).map((m) => m.personId)),
    [currentMembers],
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (persons ?? [])
      .filter((p) => !currentMemberIds.has(p.id))
      .filter((p) => !term || `${p.firstName} ${p.lastName}`.toLowerCase().includes(term));
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
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar miembros</DialogTitle>
          <DialogDescription>Selecciona una o varias personas para agregar al grupo.</DialogDescription>
        </DialogHeader>

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
            {isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
            {!isLoading && available.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                {persons?.length ? 'No hay personas disponibles con ese nombre.' : 'No hay personas registradas todavía.'}
              </p>
            )}
            {!isLoading && available.map((p) => (
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
              <Input id="joinedAt" type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} />
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'No se pudo agregar. Verifica los datos e intenta de nuevo.'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={selectedIds.size === 0 || mutation.isPending}>
              {mutation.isPending
                ? 'Agregando...'
                : `Agregar${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
