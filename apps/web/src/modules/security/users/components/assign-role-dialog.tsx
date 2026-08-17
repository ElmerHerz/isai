import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useRolesQuery, useAssignRoleMutation } from '@/modules/security';
import { useInstitutionsQuery, useBranchesQuery } from '@/modules/general';
import { getErrorMessage } from '@/lib/toast';
import type { UserListItem } from '@isai/shared-types';

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
}

// Única forma de darle (o corregirle) un rol a un usuario que YA existe —
// antes de esto, un rol solo se asignaba en el momento de crearlo; si ese
// paso fallaba (ver user-form-dialog.tsx), no había manera de arreglarlo
// desde la UI.
export function AssignRoleDialog({ open, onOpenChange, user }: AssignRoleDialogProps) {
  const { data: roles } = useRolesQuery();
  const mutation = useAssignRoleMutation();

  const [roleId, setRoleId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [branchId, setBranchId] = useState('');

  const { data: institutions } = useInstitutionsQuery();
  const { data: branches } = useBranchesQuery(institutionId || '');

  useEffect(() => {
    if (open) {
      setRoleId('');
      setInstitutionId('');
      setBranchId('');
    }
  }, [open]);

  useEffect(() => {
    setBranchId('');
  }, [institutionId]);

  const onSubmit = () => {
    if (!roleId) return;
    mutation.mutate(
      { userId: user.id, roleId, institutionId: institutionId || undefined, branchId: branchId || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar rol</DialogTitle>
          <DialogDescription>
            {user.firstName} {user.lastName} — puedes darle un rol adicional o corregir uno que falló al crearse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-role">Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="assign-role">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assign-institution">Institución (opcional)</Label>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger id="assign-institution">
                  <SelectValue placeholder="Todo el tenant" />
                </SelectTrigger>
                <SelectContent>
                  {institutions?.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-branch">Sucursal (opcional)</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={!institutionId}>
                <SelectTrigger id="assign-branch">
                  <SelectValue placeholder="Toda la institución" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo asignar el rol. Intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!roleId || mutation.isPending}>
              {mutation.isPending ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
