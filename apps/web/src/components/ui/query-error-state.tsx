import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './button';

interface QueryErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

// Estado de error reutilizable para cualquier lista/detalle que dependa de
// un useQuery — sin esto, una carga que falla se ve exactamente igual que
// "todavía no hay datos" (el toast global ya avisó, pero desaparece y no
// deja rastro en la pantalla). `onRetry` normalmente es el `refetch` que ya
// devuelve useQuery.
export function QueryErrorState({
  message = 'No se pudo cargar la información.',
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-1.5 h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
