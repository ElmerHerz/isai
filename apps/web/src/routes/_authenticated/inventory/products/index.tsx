import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Package, Plus, Tags } from 'lucide-react';
import { useProductsQuery, useProductCategoriesQuery } from '@/modules/inventario';
import { ProductFormDialog } from '@/modules/inventario/products/components/product-form-dialog';
import { CategoriesManagerDialog } from '@/modules/inventario/product-categories/components/categories-manager-dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';

export const Route = createFileRoute('/_authenticated/inventory/products/')({
  component: ProductsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const ALL_CATEGORIES_SENTINEL = '__all__';

function formatSalePrice(price: string | null | undefined) {
  if (price == null) return '— (solo uso interno)';
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(price));
}

function ProductsPage() {
  const { data: products, isLoading, isError, refetch } = useProductsQuery();
  const { data: categories } = useProductCategoriesQuery();
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_SENTINEL);
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const filteredProducts = products?.filter(
    (p) => categoryFilter === ALL_CATEGORIES_SENTINEL || p.categoryId === categoryFilter,
  );

  return (
    <div>
      <PageHeader
        icon={Package}
        title="Productos"
        description="Catálogo de productos — para vender o para uso interno de la institución."
        action={
          <div className="flex gap-2">
            <Button variant="translucent" onClick={() => setCategoriesOpen(true)}>
              <Tags className="mr-2 h-4 w-4" />
              Categorías
            </Button>
            <Button variant="translucent" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        }
      />

      {categories && categories.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES_SENTINEL}>Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                <QueryErrorState message="No se pudo cargar el catálogo de productos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && filteredProducts?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay productos.</p>
            )}

            {!isLoading &&
              !isError &&
              filteredProducts?.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/inventory/products/$productId', params: { productId: product.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatSalePrice(product.salePrice)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {product.category?.name ?? 'Sin categoría'} · {product.sku ?? 'sin SKU'}
                  </p>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>SKU</TableHead>
                  <TableHead style={headStyle}>Código de barras</TableHead>
                  <TableHead style={headStyle}>Producto</TableHead>
                  <TableHead style={headStyle}>Categoría</TableHead>
                  <TableHead style={headStyle}>Unidad</TableHead>
                  <TableHead style={headStyle} className="text-right">Precio de venta</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={7} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <QueryErrorState message="No se pudo cargar el catálogo de productos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && filteredProducts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Todavía no hay productos.
                    </TableCell>
                  </TableRow>
                )}

                {filteredProducts?.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/inventory/products/$productId', params: { productId: product.id } })}
                  >
                    <TableCell>{product.sku ?? '—'}</TableCell>
                    <TableCell>{product.barcode ?? '—'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category?.name ?? 'Sin categoría'}</TableCell>
                    <TableCell>{product.unitCode}</TableCell>
                    <TableCell className="text-right">{formatSalePrice(product.salePrice)}</TableCell>
                    <TableCell>{product.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CategoriesManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}
