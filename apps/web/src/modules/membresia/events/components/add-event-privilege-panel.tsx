import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usePersonsQuery, usePrivilegeTypesQuery, useCreateEventPrivilegeMutation } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';

interface AddEventPrivilegePanelProps {
  eventId: string;
  institutionId: string;
  onDone: () => void;
}

export function AddEventPrivilegePanel({ eventId, institutionId, onDone }: AddEventPrivilegePanelProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const canViewPrivilegeTypes = permissions.includes('membership.event.view');
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId, canViewPersons);
  const { data: privilegeTypes } = usePrivilegeTypesQuery(undefined, canViewPrivilegeTypes);
  const mutation = useCreateEventPrivilegeMutation(eventId);

  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [privilegeTypeId, setPrivilegeTypeId] = useState('');
  const [notes, setNotes] = useState('');

  const activeTypes = privilegeTypes?.filter((t) => t.isActive) ?? [];

  const available = useMemo(() => {
    const term = normalizeText(search.trim());
    return (persons ?? []).filter((p) => !term || normalizeText(`${p.firstName} ${p.lastName}`).includes(term));
  }, [persons, search]);

  const onSubmit = () => {
    if (!personId || !privilegeTypeId) return;
    mutation.mutate({ personId, privilegeTypeId, notes: notes || undefined }, { onSuccess: onDone });
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Asignar privilegio</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

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

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!personId || !privilegeTypeId || mutation.isPending}>
            {mutation.isPending ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
