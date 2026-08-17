import { Users } from 'lucide-react';
import { usePersonQuery } from '@/modules/membresia';
import { PersonDetailContent } from './person-detail-content';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
}

// Versión en modal del detalle de persona — usada en escritorio (ver
// persons/index.tsx: el ícono "Ver" de la tabla abre esto en vez de
// navegar). En móvil el mismo contenido vive en su propia página de ruta
// ($personId.tsx), reusando PersonDetailContent para no duplicar la lógica.
export function PersonDetailDialog({ open, onOpenChange, personId }: PersonDetailDialogProps) {
  const { data: person } = usePersonQuery(personId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate">
                {person ? `${person.firstName} ${person.lastName}` : 'Persona'}
              </DialogTitle>
              <DialogDescription className="truncate">
                {person ? [person.personType.name, person.branch?.name].filter(Boolean).join(' · ') : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <PersonDetailContent personId={personId} />
      </DialogContent>
    </Dialog>
  );
}
