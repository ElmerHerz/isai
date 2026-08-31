import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRolesQuery, usePermissionsQuery, useAssignPermissionsMutation } from '@/modules/security';
import { getErrorMessage } from '@/lib/toast';
import type { PermissionWithModule } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/security/roles/$roleId/permissions')({
  component: RolePermissionsPage,
});

function RolePermissionsPage() {
  const { roleId } = Route.useParams();
  const navigate = useNavigate();
  const { data: roles } = useRolesQuery();
  const role = roles?.find((r) => r.id === roleId);
  const { data: permissions, isLoading } = usePermissionsQuery();
  const assignMutation = useAssignPermissionsMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role) {
      setSelected(new Set(role.rolePermissions.map((rp) => rp.permission.id)));
    }
  }, [role]);

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
    if (!role) return;
    assignMutation.mutate(
      { roleId: role.id, permissionIds: [...selected] },
      { onSuccess: () => navigate({ to: '/security/roles' }) },
    );
  };

  return (
    <div>
      <Link
        to="/security/roles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Roles
      </Link>

      {role && (
        <Card className="mt-4 rounded-2xl">
          <CardContent className="p-4">
            <h2 className="mb-1 text-sm font-semibold">Permisos de &quot;{role.name}&quot;</h2>
            <p className="mb-4 text-xs text-muted-foreground">Marca los permisos que este rol debe tener.</p>

            <div className="space-y-4">
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
              <p className="mt-4 text-sm text-destructive">
                {getErrorMessage(assignMutation.error, 'No se pudo guardar. Intenta de nuevo.')}
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={onSave} disabled={assignMutation.isPending}>
                {assignMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
