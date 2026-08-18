import { Calendar } from 'lucide-react';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

interface DateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

// El <input type="date"> nativo no permite controlar el formato de su texto
// en estado cerrado (lo decide el idioma/región del navegador del
// visitante, no la página) — así que sigue ahí como fuente de verdad
// (calendario nativo, teclado, móvil, todo intacto) pero invisible, con una
// capa propia encima mostrando dd/mm/aaaa vía formatDate() — mismo formato
// que ya usa el resto de la app. Ver plan de sesión.
export function DateInput({ id, value, onChange, placeholder = 'dd/mm/aaaa', disabled, min, max, className }: DateInputProps) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="date"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span className={cn('pointer-events-none flex-1', !value && 'text-muted-foreground')}>
        {value ? formatDate(value) : placeholder}
      </span>
      <Calendar className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
