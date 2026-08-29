import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Truck, Plus, Pencil } from 'lucide-react';
import { useSuppliersQuery } from '@/modules/comercio';
import { SupplierFormDialog } from '@/modules/comercio/suppliers/components/supplier-form-dialog';
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
import type { Supplier } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/store/suppliers/')({
  component: SuppliersPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function SuppliersPage() {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliersQuery();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  return (
    <div>
      <PageHeader
        icon={Truck}
        title="Proveedores"
        description="A quién se le compra — se elige por compra, no por producto."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proveedor
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
                <QueryErrorState message="No se pudieron cargar los proveedores." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && suppliers?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay proveedores.</p>
            )}

            {!isLoading &&
              !isError &&
              suppliers?.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => setEditingSupplier(supplier)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{supplier.name}</p>
                    {!supplier.isActive && <span className="shrink-0 text-xs text-muted-foreground">Inactivo</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[supplier.phone, supplier.email].filter(Boolean).join(' · ') || '—'}
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
                  <TableHead style={headStyle}>NIT</TableHead>
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
                      <QueryErrorState message="No se pudieron cargar los proveedores." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && suppliers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Todavía no hay proveedores.
                    </TableCell>
                  </TableRow>
                )}

                {suppliers?.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className={cn('font-medium', !supplier.isActive && 'text-muted-foreground')}>
                      {supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{supplier.taxId ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[supplier.phone, supplier.email].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{supplier.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setEditingSupplier(supplier)}>
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

      <SupplierFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SupplierFormDialog
        open={!!editingSupplier}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
        supplier={editingSupplier ?? undefined}
      />
    </div>
  );
}
