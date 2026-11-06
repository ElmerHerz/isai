import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'translucent' | 'edit' | 'delete' | 'create' | 'approve' | 'reject' | 'post';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

// Paleta de acciones semánticas (decidida con el usuario, ver sesión):
// azul = editar, verde = crear/aprobar, rojo = eliminar/rechazar,
// índigo = contabilizar (mueve dinero real, la acción más delicada del
// sistema — se distingue a propósito de crear/aprobar aunque ambas sean
// "positivas"). Lo neutro (Cancelar, Exportar, Cerrar) se queda en gris:
// si todo tuviera color, el color dejaría de significar algo.
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  // Antes el borde de --input era gris casi blanco (91% luminosidad) — se
  // perdía contra el borde de la tarjeta que lo rodea, quedando "invisible"
  // (hallazgo de sesión: "la mayoría son blancos, no resaltan"). border-2 +
  // gris más oscuro + sombra lo separa del fondo sin competir con las
  // variantes de color de abajo — esta se queda neutra a propósito.
  outline:
    'border-2 border-slate-300 bg-background shadow-sm hover:border-slate-400 hover:bg-accent hover:text-accent-foreground dark:border-slate-600 dark:hover:border-slate-500',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  // Para botones sobre un banner de color (ver PageHeader) — blanco translúcido.
  translucent: 'border border-white/40 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30',
  // rounded-full a propósito en las 6 de abajo (no solo en ícono-sin-texto):
  // un mismo lenguaje visual de "píldora de color = acción semántica" sirve
  // igual para el ícono suelto de una tabla que para un botón con texto
  // ("✏️ Editar"), y las separa claramente de "default"/"outline" (acciones
  // genéricas de formulario, sin significado propio).
  edit: 'rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60',
  delete: 'rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60',
  create: 'rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60',
  approve: 'rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60',
  reject: 'rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60',
  post: 'rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60',
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
