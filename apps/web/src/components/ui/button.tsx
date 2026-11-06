import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'translucent' | 'edit' | 'delete';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  // El borde de --input es gris casi blanco (91% luminosidad) — a secas se
  // perdía contra el borde de la tarjeta que lo rodea, quedando como un
  // botón "invisible". border-2 + un gris más oscuro + sombra lo separa del
  // fondo sin competir con el azul sólido de "default" (hallazgo de sesión:
  // "la mayoría son blancos, no resaltan").
  outline:
    'border-2 border-slate-300 bg-background shadow-sm hover:border-slate-400 hover:bg-accent hover:text-accent-foreground dark:border-slate-600 dark:hover:border-slate-500',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  // Para botones sobre un banner de color (ver PageHeader) — blanco translúcido.
  translucent: 'border border-white/40 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30',
  // Acciones de tabla con color estándar por tipo de acción (no por módulo) —
  // azul = editar, rojo = eliminar, igual en cualquier página.
  edit: 'rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60',
  delete: 'rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
