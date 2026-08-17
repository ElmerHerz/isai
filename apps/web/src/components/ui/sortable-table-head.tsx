import type { ReactNode, ThHTMLAttributes } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from './table';
import type { SortDirection } from '@/lib/use-search-and-sort';

interface SortableTableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  activeSortKey: string;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  /** <ColumnFilter .../> opcional — se renderiza junto al botón de orden. */
  filter?: ReactNode;
}

export function SortableTableHead({
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  filter,
  children,
  ...props
}: SortableTableHeadProps) {
  const isActive = sortKey === activeSortKey;

  return (
    <TableHead {...props}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {children}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
        {filter}
      </div>
    </TableHead>
  );
}
