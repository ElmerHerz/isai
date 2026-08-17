import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { CheckCircle2, MinusCircle, Plus, UserCog, Users as UsersIcon } from 'lucide-react';
import { useUsersQuery } from '@/modules/security';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { UserFormDialog } from '@/modules/security/users/components/user-form-dialog';
import { AssignRoleDialog } from '@/modules/security/users/components/assign-role-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { StatChip } from '@/components/layout/stat-chip';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import { cn } from '@/lib/utils';
import type { UserListItem } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/security/users')({
  component: UsersListPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function UsersListPage() {
  const { data: users, isLoading, isError, refetch } = useUsersQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [assigningRoleUser, setAssigningRoleUser] = useState<UserListItem | null>(null);
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const stats = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.isActive).length,
      inactive: list.filter((u) => !u.isActive).length,
    };
  }, [users]);

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
    users,
    (u) => `${u.firstName} ${u.lastName} ${u.email}`,
    {
      usuario: (u) => `${u.lastName} ${u.firstName}`,
      rol: (u) => u.roles.join(', '),
      estado: (u) => (u.isActive ? 1 : 0),
    },
    'usuario',
    {
      // "Rol" no lleva filtro — un usuario puede tener varios roles a la
      // vez y el checklist de columna asume un solo valor por fila; el
      // buscador global ya permite escribir el nombre de un rol si hace falta.
      estado: (u) => (u.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  return (
    <div>
      <PageHeader
        icon={UsersIcon}
        title="Usuarios"
        description="Los usuarios que tienen acceso al sistema."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatChip icon={UsersIcon} label="Total" value={stats.total} />
        <StatChip icon={CheckCircle2} label="Activos" value={stats.active} tone="success" />
        <StatChip icon={MinusCircle} label="Inactivos" value={stats.inactive} tone="warning" />
        <TableSearch value={search} onChange={setSearch} placeholder="Buscar usuario o correo..." />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead sortKey="usuario" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Usuario
                  </SortableTableHead>
                  <SortableTableHead sortKey="rol" activeSortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} style={headStyle}>
                    Rol
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="estado"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    style={headStyle}
                    filter={
                      <ColumnFilter
                        label="Estado"
                        options={filterOptions.estado}
                        selected={filters.estado}
                        onToggle={(v) => toggleFilterValue('estado', v)}
                        onClear={() => clearFilter('estado')}
                      />
                    }
                  >
                    Estado
                  </SortableTableHead>
                  <TableHead className="w-px" style={headStyle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={4} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <QueryErrorState message="No se pudieron cargar los usuarios." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Todavía no hay usuarios.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && (users?.length ?? 0) > 0 && result.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No se encontraron resultados para tu búsqueda.
                    </TableCell>
                  </TableRow>
                )}

                {paginatedResult.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {initials(user.firstName, user.lastName)}
                        </span>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) }}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin rol</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="edit"
                          size="icon"
                          onClick={() => setAssigningRoleUser(user)}
                          aria-label="Asignar rol"
                          title="Asignar rol"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {assigningRoleUser && (
        <AssignRoleDialog
          open={!!assigningRoleUser}
          onOpenChange={(open) => !open && setAssigningRoleUser(null)}
          user={assigningRoleUser}
        />
      )}
    </div>
  );
}
