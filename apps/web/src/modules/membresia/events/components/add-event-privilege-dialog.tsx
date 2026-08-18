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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usePersonsQuery, usePrivilegeTypesQuery, useCreateEventPrivilegeMutation } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AddEventPrivilegeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  institutionId: string;
}

export function AddEventPrivilegeDialog({ open, onOpenChange, eventId, institutionId }: AddEventPrivilegeDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId, canViewPersons);
  const { data: privilegeTypes } = usePrivilegeTypesQuery();
  const mutation = useCreateEventPrivilegeMutation(eventId);

  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [privilegeTypeId, setPrivilegeTypeId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSearch('');
      setPersonId('');
      setPrivilegeTypeId('');
      setNotes('');
    }
  }, [open]);

  const activeTypes = privilegeTypes?.filter((t) => t.isActive) ?? [];

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (persons ?? []).filter((p) => !term || `${p.firstName} ${p.lastName}`.toLowerCase().includes(term));
  }, [persons, search]);

  const onSubmit = () => {
    if (!personId || !privilegeTypeId) return;
    mutation.mutate({ personId, privilegeTypeId, notes: notes || undefined }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar privilegio</DialogTitle>
          <DialogDescription>Elige a la persona y su privilegio en este culto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privilege-person-search">Buscar persona</Label>
            <Input
              id="privilege-person-search"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-lg border">
            {!canViewPersons && (
              <p className="p-3 text-sm text-muted-foreground">No tienes permiso para ver personas.</p>
            )}
            {canViewPersons && isPersonsLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
            {canViewPersons && !isPersonsLoading && available.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Nadie coincide con esa búsqueda.</p>
            )}
            {canViewPersons && !isPersonsLoading &&
              available.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonId(p.id)}
                  className={cn(
                    'flex w-full items-center border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50',
                    personId === p.id && 'bg-primary/10 font-medium text-primary',
                  )}
                >
                  {p.firstName} {p.lastName}
                </button>
              ))}
          </div>

          {activeTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay tipos de privilegio configurados. Un Administrador puede crearlos desde{' '}
              <span className="font-medium">Catálogos → Privilegios</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="privilege-type">Privilegio</Label>
              <Select value={privilegeTypeId} onValueChange={setPrivilegeTypeId}>
                <SelectTrigger id="privilege-type">
                  <SelectValue placeholder="Selecciona un privilegio" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="privilege-notes">Notas (opcional)</Label>
            <Input id="privilege-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo asignar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!personId || !privilegeTypeId || mutation.isPending}>
              {mutation.isPending ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
