import { useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';

interface PersonOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface PersonComboboxProps {
  id?: string;
  persons: PersonOption[];
  value: string;
  onChange: (personId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Reemplaza un <Select> plano cuando hay que elegir UNA persona entre
// muchas (ej. "Líder" al crear un grupo) — con decenas/cientos de personas,
// desplazarse por un <Select> sin buscador es impráctico. Mismo patrón de
// "input de búsqueda + lista filtrada" que ya usa add-group-member-dialog.tsx,
// solo que en un Popover porque acá es selección única, no un checklist
// siempre visible en el diálogo.
export function PersonCombobox({ id, persons, value, onChange, placeholder, disabled }: PersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = persons.find((p) => p.id === value);
  const term = normalizeText(search.trim());
  const filtered = term
    ? persons.filter((p) => normalizeText(`${p.firstName} ${p.lastName}`).includes(term))
    : persons;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn('min-w-0 flex-1 truncate text-left', !selected && 'text-muted-foreground')}>
            {selected ? `${selected.firstName} ${selected.lastName}` : (placeholder ?? 'Selecciona una persona')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
                setSearch('');
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {p.id === value && <Check className="h-4 w-4" />}
              </span>
              {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
