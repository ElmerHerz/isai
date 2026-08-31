import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useMeQuery, useRolesQuery, useDeleteRoleMutation } from '@/modules/security';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import type { RoleWithPermissions } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/security/roles/')({
  component: RolesListPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function RolesListPage() {
  const { data: roles, isLoading, isError, refetch } = useRolesQuery();
  const { data: currentUser } = useMeQuery();
  const isSuperadmin = !!currentUser && !currentUser.tenantId;
  const deleteMutation = useDeleteRoleMutation();
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(null);

  const stats = useMemo(() => {
    const list = roles ?? [];
    return {
      total: list.length,
      system: list.filter((r) => r.isSystem).length,
      custom: list.filter((r) => !r.isSystem).length,
    };
  }, [roles]);

  const {
    search,
    setSearch,
    sortKey,
    sortDirection,
    toggleSort,
    filters,
    filterOptions,
    toggleFilterValue,
    clearFilter,
    result,
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    paginatedResult,
  } = useSearchAndSort(
    roles,
    (r) => `${r.name} ${r.code}`,
    {
      rol: (r) => r.name,
      tipo: (r) => (r.isSystem ? 1 : 0),
      permisos: (r) => r.rolePermissions.length,
    },
    'rol',
    {
      tipo: (r) => (r.isSystem ? 'Sistema' : 'Personalizado'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={KeyRound}
        title="Roles"
        description="Roles y sus permisos."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/security/roles/new' })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo rol
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatChip icon={KeyRound} label="Total" value={stats.total} />
        <StatChip icon={ShieldCheck} label="Sistema" value={stats.system} tone="accent" />
        <StatChip icon={Lock} label="Personalizados" value={stats.custom} />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar rol..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="rol" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Rol
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="tipo"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Tipo"
                        options={filterOptions.tipo}
                        selected={filters.tipo}
                        onToggle={(v) => toggleFilterValue('tipo', v)}
                        onClear={() => clearFilter('tipo')}
                      />
                    }
                  >
                    Tipo
                  </SortableTableHead>
                  <SortableTableHead sortKey="permisos" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Permisos
                  </SortableTableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={4} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <QueryErrorState message="No se pudieron cargar los roles." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && roles?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Todavía no hay roles.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (roles?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((role) => {
                  // "superadmin" nunca se toca. Los demás roles de sistema
                  // (hoy solo "admin") sí se pueden editar, pero únicamente
                  // por un superadmin — mismo criterio que el backend.
                  const isLocked = role.code === 'superadmin' || (role.isSystem && !isSuperadmin);
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.code}</p>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) }}
                          >
                            Sistema
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Personalizado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                          onClick={() => navigate({ to: '/security/roles/$roleId/permissions', params: { roleId: role.id } })}
                          disabled={isLocked}
                          title={isLocked ? 'Este rol de sistema no se puede editar' : undefined}
                        >
                          {role.rolePermissions.length} permiso(s)
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="edit"
                            size="icon"
                            onClick={() => navigate({ to: '/security/roles/$roleId', params: { roleId: role.id } })}
                            disabled={isLocked}
                            aria-label="Editar"
                            title={isLocked ? 'Este rol de sistema no se puede editar' : 'Editar'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="delete"
                            size="icon"
                            onClick={() => setDeletingRole(role)}
                            disabled={role.isSystem}
                            aria-label="Eliminar"
                            title={role.isSystem ? 'Los roles de sistema no se pueden eliminar' : 'Eliminar'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={result.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </motion.div>

      <ConfirmDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title="Eliminar rol"
        description={
          deletingRole
            ? `Esto elimina el rol "${deletingRole.name}". Los usuarios que lo tengan asignado se quedan sin permisos hasta que les asignes otro. No se puede deshacer.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingRole) return;
          deleteMutation.mutate(deletingRole.id, { onSuccess: () => setDeletingRole(null) });
        }}
      />
    </div>
  );
}
