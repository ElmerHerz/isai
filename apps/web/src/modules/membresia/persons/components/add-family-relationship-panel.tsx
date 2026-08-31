import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCatalogItemsQuery } from '@/modules/general';
import {
  usePersonsQuery,
  usePersonRelationshipsQuery,
  useCreatePersonRelationshipMutation,
} from '@/modules/membresia';
import { getErrorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';

const RELATIONSHIP_TYPE_CATALOG_CODE = 'relationship_type';

interface AddFamilyRelationshipPanelProps {
  personId: string;
  institutionId: string;
  onDone: () => void;
}

// "X es mi ___": se elige a la otra persona y el parentesco QUE ELLA TIENE
// respecto a la persona actual (ej. elijo a Juan y "Hijo/a" -> Juan es hijo
// de esta persona). El backend calcula el lado inverso solo, ver
// PersonsService.findRelationships.
export function AddFamilyRelationshipPanel({ personId, institutionId, onDone }: AddFamilyRelationshipPanelProps) {
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId);
  const { data: existing } = usePersonRelationshipsQuery(personId);
  const { data: relationshipTypes } = useCatalogItemsQuery(RELATIONSHIP_TYPE_CATALOG_CODE);
  const mutation = useCreatePersonRelationshipMutation(personId);

  const [search, setSearch] = useState('');
  const [relatedPersonId, setRelatedPersonId] = useState('');
  const [relationshipTypeId, setRelationshipTypeId] = useState('');
  const [notes, setNotes] = useState('');

  const existingRelatedIds = useMemo(() => new Set((existing ?? []).map((r) => r.relatedPerson.id)), [existing]);

  const available = useMemo(() => {
    const term = normalizeText(search.trim());
    return (persons ?? [])
      .filter((p) => p.id !== personId && !existingRelatedIds.has(p.id))
      .filter((p) => !term || normalizeText(`${p.firstName} ${p.lastName}`).includes(term));
  }, [persons, personId, existingRelatedIds, search]);

  const onSubmit = () => {
    if (!relatedPersonId || !relationshipTypeId) return;
    mutation.mutate(
      { relatedPersonId, relationshipTypeId, notes: notes || undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agregar familiar</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="relative-search">Buscar persona</Label>
          <Input
            id="relative-search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {isPersonsLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
          {!isPersonsLoading && available.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nadie coincide con esa búsqueda.</p>
          )}
          {!isPersonsLoading &&
            available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRelatedPersonId(p.id)}
                className={cn(
                  'flex w-full items-center border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50',
                  relatedPersonId === p.id && 'bg-primary/10 font-medium text-primary',
                )}
              >
                {p.firstName} {p.lastName}
              </button>
            ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship-type">Esa persona es su...</Label>
          <Select value={relationshipTypeId} onValueChange={setRelationshipTypeId}>
            <SelectTrigger id="relationship-type">
              <SelectValue placeholder="Selecciona un parentesco" />
            </SelectTrigger>
            <SelectContent>
              {relationshipTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship-notes">Notas (opcional)</Label>
          <Input id="relationship-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!relatedPersonId || !relationshipTypeId || mutation.isPending}
          >
            {mutation.isPending ? 'Agregando...' : 'Agregar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
