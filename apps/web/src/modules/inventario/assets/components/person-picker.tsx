import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersonsQuery } from '@/modules/membresia';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';

interface PersonPickerProps {
  institutionId: string;
  value?: string;
  onChange: (personId: string | undefined, personName: string | undefined) => void;
}

// Búsqueda + lista con scroll — mismo patrón que ya usa
// proyectos/projects/components/add-contribution-dialog.tsx para elegir un
// aportante, simplificado (siempre una persona ya existente, sin "Grupo" ni
// "Nueva persona rápida").
export function PersonPicker({ institutionId, value, onChange }: PersonPickerProps) {
  const [search, setSearch] = useState('');
  const { data: persons, isLoading } = usePersonsQuery(institutionId, !!institutionId);
  const term = normalizeText(search);
  const available = (persons ?? []).filter((p) => normalizeText(`${p.firstName} ${p.lastName}`).includes(term));

  return (
    <div className="space-y-2">
      <Label htmlFor="custodian-search">Buscar persona</Label>
      <Input id="custodian-search" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="max-h-48 overflow-y-auto rounded-lg border">
        {isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
        {!isLoading && available.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Nadie coincide con esa búsqueda.</p>
        )}
        {!isLoading &&
          available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id, `${p.firstName} ${p.lastName}`)}
              className={cn(
                'flex w-full items-center border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50',
                value === p.id && 'bg-primary/10 font-medium text-primary',
              )}
            >
              {p.firstName} {p.lastName}
            </button>
          ))}
      </div>
    </div>
  );
}
