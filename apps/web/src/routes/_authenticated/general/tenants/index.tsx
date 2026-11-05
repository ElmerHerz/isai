import { createFileRoute } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { useMeQuery } from '@/modules/security';
import { useTenantsQuery, useModulesQuery, useToggleTenantModuleMutation } from '@/modules/general';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/general/tenants/')({
  component: TenantsModulesPage,
});

function TenantsModulesPage() {
  const { data: me, isLoading: isMeLoading } = useMeQuery();
  const isSuperadmin = !!me && !me.tenantId;

  // GET /tenants y GET /modules son @SuperadminOnly() — enabled: false
  // evita el toast de 403 si alguien que no es superadmin llega a esta
  // ruta (el backend ya la bloquea de cualquier forma).
  const { data: tenants, isLoading: isTenantsLoading, isError, refetch } = useTenantsQuery(isSuperadmin);
  const { data: modules, isLoading: isModulesLoading } = useModulesQuery(isSuperadmin);
  const toggleMutation = useToggleTenantModuleMutation();

  const toggleableModules = modules?.filter((m) => !m.isCore) ?? [];
  const isLoading = isMeLoading || (isSuperadmin && (isTenantsLoading || isModulesLoading));

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Tenants"
        description="Módulos activos por tenant — los módulos core (General, Seguridad) siempre están activos."
      />

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}

          {!isLoading && !isSuperadmin && (
            <p className="p-6 text-sm text-muted-foreground">
              Esta pantalla es solo para el superadmin de la plataforma.
            </p>
          )}

          {!isLoading && isSuperadmin && isError && (
            <div className="p-6">
              <QueryErrorState message="No se pudieron cargar los tenants." onRetry={() => refetch()} />
            </div>
          )}

          {!isLoading && isSuperadmin && !isError && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    {toggleableModules.map((module) => (
                      <TableHead key={module.code} className="text-center">
                        {module.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={1 + toggleableModules.length} className="text-center text-muted-foreground">
                        Todavía no hay tenants.
                      </TableCell>
                    </TableRow>
                  )}

                  {tenants?.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </TableCell>
                      {toggleableModules.map((module) => {
                        const checked = tenant.activeModuleCodes?.includes(module.code) ?? false;
                        const isPendingThis =
                          toggleMutation.isPending &&
                          toggleMutation.variables?.tenantId === tenant.id &&
                          toggleMutation.variables?.moduleCode === module.code;
                        return (
                          <TableCell key={module.code} className="text-center">
                            <Switch
                              checked={checked}
                              disabled={isPendingThis}
                              className={cn(isPendingThis && 'opacity-50')}
                              onCheckedChange={(next) =>
                                toggleMutation.mutate({ tenantId: tenant.id, moduleCode: module.code, activate: next })
                              }
                              aria-label={`${module.name} — ${tenant.name}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
