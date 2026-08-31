import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Users, Plus, Pencil } from 'lucide-react';
import { useCustomersQuery } from '@/modules/comercio';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/store/customers/')({
  component: CustomersPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function CustomersPage() {
  const { data: customers, isLoading, isError, refetch } = useCustomersQuery();
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Clientes"
        description="A quién se le vende — opcional, una venta puede ser a Consumidor Final."
        action={
          <Button variant="translucent" onClick={() => navigate({ to: '/store/customers/new' })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {/* Móvil: tarjetas apiladas. */}
          <div className="divide-y sm:hidden">
            {isLoading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudieron cargar los clientes." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && customers?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay clientes.</p>
            )}

            {!isLoading &&
              !isError &&
              customers?.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/store/customers/$customerId', params: { customerId: customer.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{customer.name}</p>
                    {!customer.isActive && <span className="shrink-0 text-xs text-muted-foreground">Inactivo</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Nombre</TableHead>
                  <TableHead style={headStyle}>NIT/DUI</TableHead>
                  <TableHead style={headStyle}>Contacto</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                  <TableHead style={headStyle} className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={5} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <QueryErrorState message="No se pudieron cargar los clientes." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && customers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay clientes.
                    </TableCell>
                  </TableRow>
                )}

                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className={cn('font-medium', !customer.isActive && 'text-muted-foreground')}>
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.taxId ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{customer.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate({ to: '/store/customers/$customerId', params: { customerId: customer.id } })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
