import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePermissionsQuery, useAssignPermissionsMutation } from '@/modules/security';
import { getErrorMessage } from '@/lib/toast';
import type { PermissionWithModule, RoleWithPermissions } from '@isai/shared-types';

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleWithPermissions;
}

export function RolePermissionsDialog({ open, onOpenChange, role }: RolePermissionsDialogProps) {
  const { data: permissions, isLoading } = usePermissionsQuery();
  const assignMutation = useAssignPermissionsMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(role.rolePermissions.map((rp) => rp.permission.id)));
    }
  }, [open, role]);

  const groups = useMemo(() => {
    const byModule = new Map<
      string,
      { module: { code: string; name: string; colorHex: string }; items: PermissionWithModule[] }
    >();

    for (const permission of permissions ?? []) {
      const existing = byModule.get(permission.moduleCode);
      if (existing) {
        existing.items.push(permission);
      } else {
        byModule.set(permission.moduleCode, { module: permission.module, items: [permission] });
      }
    }

    return [...byModule.values()];
  }, [permissions]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onSave = () => {
    assignMutation.mutate(
      { roleId: role.id, permissionIds: [...selected] },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Permisos de &quot;{role.name}&quot;</DialogTitle>
          <DialogDescription>Marca los permisos que este rol debe tener.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando permisos...</p>}

          {!isLoading && groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay permisos en el catálogo todavía.</p>
          )}

          {groups.map(({ module, items }) => (
            <div key={module.code}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: module.colorHex }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module.name}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg border p-3 sm:grid-cols-2">
                {items.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={selected.has(permission.id)}
                      onChange={() => toggle(permission.id)}
                    />
                    {permission.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {assignMutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(assignMutation.error, 'No se pudo guardar. Intenta de nuevo.')}
          </p>
        )}

        <DialogFooter>
          <Button onClick={onSave} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
