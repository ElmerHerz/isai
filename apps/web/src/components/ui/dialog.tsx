import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    // z-[1100]: Leaflet fija z-index:1000 en sus controles/panes desde su
    // propio CSS (.leaflet-top/.leaflet-bottom) — con z-50 el diálogo
    // quedaba detrás del mapa en /general/branches/:id.
    className={cn(
      'fixed inset-0 z-[1100] bg-black/50 backdrop-blur-[2px]',
      'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // px-6 sin py-6: el padding vertical se lo dan DialogHeader/Footer a
        // sí mismos (ver comentario ahí) — tenerlo también aquí obligaba a
        // cancelarlo con márgenes negativos en el header/footer sticky, y esa
        // combinación (padding del contenedor + margen negativo + sticky)
        // dejaba un hueco de ~24px donde el contenido ya scrolleado se
        // alcanzaba a ver antes de quedar tapado del todo.
        'fixed left-1/2 top-1/2 z-[1100] max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background px-6 shadow-2xl ring-1 ring-black/5 focus:outline-none dark:ring-white/10',
        'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Franja superior separada del cuerpo por un borde — antes el título flotaba
// suelto con solo un margen inferior, sin ninguna jerarquía visual frente al
// resto del contenido. Solo -mx-6 (horizontal) para abarcar todo el ancho —
// ya NO cancela padding vertical del contenedor (ver comentario en
// DialogContent): mt-0 real, sin negative-margin, para que el cálculo de
// sticky quede exacto y no deje un hueco donde el contenido scrolleado se
// alcanza a ver antes de quedar tapado del todo.
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // sticky: en un formulario largo (ej. Editar persona) el título no
        // desaparece al bajar a buscar un campo más abajo.
        //
        // bg-background SÓLIDO, no /95 con blur: los colores en
        // tailwind.config.js están definidos como hsl(var(--x)) sin el
        // patrón <alpha-value>, así que el modificador de opacidad no se
        // aplicaba de forma confiable — el fondo quedaba casi transparente
        // y el texto del formulario se veía pasar detrás al hacer scroll.
        'sticky top-0 -mx-6 mb-5 flex flex-col space-y-1.5 rounded-t-2xl border-b bg-background px-6 py-4 pr-12',
        className,
      )}
      {...props}
    />
  );
}

// Misma idea que DialogHeader pero abajo — separa visualmente los botones de
// acción del contenido del formulario (en vez de dejarlos flotando con solo
// un margen superior) y los mantiene a la vista mientras se hace scroll en
// un formulario largo, mismo criterio de sticky que DialogHeader (fondo
// sólido y sin cancelar padding vertical, por la misma razón — ver
// comentario ahí).
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-6 mt-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-background px-6 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
