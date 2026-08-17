import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterOption } from '@/lib/use-search-and-sort';

interface ColumnFilterProps {
  label: string;
  options: FilterOption[] | undefined;
  selected: Set<string> | undefined;
  onToggle: (value: string) => void;
  onClear: () => void;
}

export function ColumnFilter({ label, options, selected, onToggle, onClear }: ColumnFilterProps) {
  const hasActive = !!selected && selected.size > 0;

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10',
            hasActive ? 'text-primary' : 'opacity-60',
          )}
          aria-label={`Filtrar por ${label}`}
        >
          <Filter className="h-3 w-3" fill={hasActive ? 'currentColor' : 'none'} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-[1100] w-56 rounded-lg border bg-popover p-2 normal-case text-popover-foreground shadow-md"
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold">{label}</span>
            {hasActive && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(options ?? []).map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm font-normal hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-input"
                  checked={selected?.has(opt.value) ?? false}
                  onChange={() => onToggle(opt.value)}
                />
                <span className="flex-1 truncate">{opt.value}</span>
                <span className="text-xs text-muted-foreground">{opt.count}</span>
              </label>
            ))}
            {(options ?? []).length === 0 && (
              <p className="px-1 py-1 text-xs font-normal text-muted-foreground">Sin datos</p>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
