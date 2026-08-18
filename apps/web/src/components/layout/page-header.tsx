import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCurrentModuleColor } from './use-current-module-color';
import { darken } from '@/lib/color';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * PageHeader — banner de encabezado de pantalla, con degradado en el color
 * del módulo dueño de la ruta actual (general.modules.color_hex). Mismo
 * estándar visual que ya existía en el proyecto Angular anterior
 * (page-header + header-icon + btn-nuevo translúcido), pero calculado en
 * tiempo real desde la base de datos en vez de hardcodeado por página.
 */
export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  const color = useCurrentModuleColor();
  const colorDark = darken(color, 15);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
        boxShadow: `0 4px 20px -4px ${color}80`,
      }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <Icon className="h-6 w-6" />
        </span>
        {/* min-w-0: sin esto, un título/descripción larga (ej. el nombre de
            un grupo + su institución) fuerza este item de flex más ancho que
            su contenido envuelto, empujando toda la página más allá del
            viewport en móvil — el mismo bug de fondo que _authenticated.tsx,
            solo que acá en el propio banner. */}
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 break-words text-sm text-white/80">{description}</p>}
        </div>
      </div>

      {action && <div className="w-full [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}
