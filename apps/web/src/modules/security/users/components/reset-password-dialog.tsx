import { useState } from 'react';
import { Copy, Dices, Eye, EyeOff } from 'lucide-react';
import { useResetUserPasswordMutation } from '@/modules/security';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast, getErrorMessage } from '@/lib/toast';
import type { UserListItem } from '@isai/shared-types';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

interface ResetPasswordDialogProps {
  user: UserListItem | null;
  onOpenChange: (open: boolean) => void;
}

// A diferencia de ConfirmDialog, este sí necesita un campo de texto (la
// contraseña nueva) — por eso no reusa ese componente genérico. Deja la
// contraseña visible hasta que el admin cierra el diálogo: sin servicio de
// correo (ver plan de sesión), esta es la única oportunidad de copiarla
// para pasársela al usuario por fuera del sistema.
export function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [show, setShow] = useState(true);
  const mutation = useResetUserPasswordMutation();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNewPassword('');
      mutation.reset();
    }
    onOpenChange(open);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Contraseña copiada.');
    } catch {
      toast.error('No se pudo copiar — selecciónala manualmente.');
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            {user ? `Define una contraseña temporal para "${user.firstName} ${user.lastName}". Deberá cambiarla en su próximo login.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Contraseña temporal</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="newPassword"
                type={show ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? 'Ocultar' : 'Mostrar'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())} title="Generar aleatoria">
              <Dices className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={copyPassword} disabled={!newPassword} title="Copiar">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className="text-sm text-destructive">Mínimo 8 caracteres.</p>
          )}
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">{getErrorMessage(mutation.error, 'No se pudo restablecer la contraseña.')}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || newPassword.length < 8}
            onClick={() => {
              if (!user) return;
              mutation.mutate({ userId: user.id, newPassword });
            }}
          >
            {mutation.isPending ? 'Restableciendo...' : 'Restablecer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
