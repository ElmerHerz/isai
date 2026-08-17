import { TableRow, TableCell } from './table';
import { Skeleton } from './skeleton';

interface TableSkeletonRowsProps {
  columns: number;
  rows?: number;
}

// Reemplazo del texto plano "Cargando..." que se repetía en cada tabla
// mientras isLoading — mismo colSpan que ya se usaba.
export function TableSkeletonRows({ columns, rows = 5 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
