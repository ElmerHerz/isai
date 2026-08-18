import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  icon: LucideIcon;
  title: string;
  /** Botón(es) de acción a la derecha del título — no colapsan la sección al hacer click. */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Secciones plegables dentro de una misma Card — pensado para pantallas con
// varias listas largas (ej. detalle de grupo: Directiva + Miembros + Fondo)
// donde en móvil terminabas desplazándote mucho para llegar a la última.
// Estado simple en memoria (useState), sin librería nueva — no hace falta
// más que esto para colapsar/expandir.
export function CollapsibleSection({ icon: Icon, title, action, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{title}</span>
          </h2>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
