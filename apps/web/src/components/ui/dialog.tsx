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
        'fixed left-1/2 top-1/2 z-[1100] max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl ring-1 ring-black/5 focus:outline-none dark:ring-white/10',
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
// resto del contenido. Rompe el padding de DialogContent a propósito (margen
// negativo) para que la franja abarque todo el ancho, sin tener que tocar
// cada diálogo existente que usa DialogContent con su padding normal.
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // sticky: en un formulario largo (ej. Editar persona) el título no
        // desaparece al bajar a buscar un campo más abajo. El margen
        // negativo ya cancela el padding-top del contenedor, así que el
        // punto de anclaje real es top-0, no -top-6.
        'sticky top-0 -mx-6 -mt-6 mb-5 flex flex-col space-y-1.5 rounded-t-2xl border-b bg-background/95 px-6 py-4 pr-12 backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}

// Misma idea que DialogHeader pero abajo — separa visualmente los botones de
// acción del contenido del formulario (en vez de dejarlos flotando con solo
// un margen superior) y los mantiene a la vista mientras se hace scroll en
// un formulario largo, mismo criterio de sticky que DialogHeader.
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-background/95 px-6 py-4 backdrop-blur-sm sm:flex-row sm:justify-end',
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
