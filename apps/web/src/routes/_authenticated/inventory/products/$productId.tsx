import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Package } from 'lucide-react';
import {
  useProductQuery,
  useProductStockQuery,
  useProductMovementsQuery,
  useAdjustStockMutation,
  useConsumeStockMutation,
} from '@/modules/inventario';
import { ProductDetailsTab } from '@/modules/inventario/products/components/product-details-tab';
import { ProductUnitsTab } from '@/modules/inventario/products/components/product-units-tab';
import { useInstitutionsQuery, useBranchesQuery } from '@/modules/general';
import { useAccountsQuery } from '@/modules/finanzas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import type { InventoryMovement } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/inventory/products/$productId')({
  component: ProductDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const MOVEMENT_TYPE_LABELS: Record<InventoryMovement['movementType'], string> = {
  adjustment: 'Ajuste',
  internal_use: 'Uso interno',
  purchase: 'Compra',
  sale: 'Venta',
};

function formatAmount(value: string | number) {
  return `$${Number(value).toFixed(2)}`;
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { data: product, isLoading, isError, refetch } = useProductQuery(productId);

  const { data: stock } = useProductStockQuery(productId);
  const { data: movements } = useProductMovementsQuery(productId);
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const { data: branches } = useBranchesQuery(institutionId, !!institutionId);
  const { data: accounts } = useAccountsQuery();
  const expenseAccounts = accounts?.filter((a) => a.accountType.code === 'EXPENSE') ?? [];

  const [branchId, setBranchId] = useState('');

  const adjustMutation = useAdjustStockMutation(productId);
  const [quantityDelta, setQuantityDelta] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const consumeMutation = useConsumeStockMutation(productId);
  const [consumeQuantity, setConsumeQuantity] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [consumeNotes, setConsumeNotes] = useState('');

  useEffect(() => {
    if (!institutionId && institutions?.length) setInstitutionId(institutions[0]!.id);
  }, [institutions, institutionId]);

  useEffect(() => {
    if (!branchId && branches?.length) setBranchId(branches[0]!.id);
  }, [branches, branchId]);

  const handleAdjust = () => {
    const delta = Number(quantityDelta);
    if (!branchId || !delta || !adjustNotes.trim()) return;
    adjustMutation.mutate(
      { branchId, quantityDelta: delta, unitCost: unitCost ? Number(unitCost) : undefined, notes: adjustNotes.trim() },
      { onSuccess: () => { setQuantityDelta(''); setUnitCost(''); setAdjustNotes(''); } },
    );
  };

  const handleConsume = () => {
    const quantity = Number(consumeQuantity);
    if (!branchId || !quantity || quantity <= 0 || !expenseAccountId || !consumeNotes.trim()) return;
    consumeMutation.mutate(
      { branchId, quantity, expenseAccountId, notes: consumeNotes.trim() },
      { onSuccess: () => { setConsumeQuantity(''); setExpenseAccountId(''); setConsumeNotes(''); } },
    );
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return <QueryErrorState message="No se pudo cargar el producto." onRetry={() => refetch()} />;
  }

  return (
    <div>
      <Link to="/inventory/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Productos
      </Link>

      <PageHeader
        icon={Package}
        title={product.name}
        description={`${product.category?.name ?? 'Sin categoría'} · ${product.sku ?? 'sin SKU'} · ${product.barcode ?? 'sin código de barras'}`}
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Precio de venta</p>
          <p className="mt-1 text-lg font-semibold">{product.salePrice == null ? 'Solo uso interno' : formatAmount(product.salePrice)}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Costo promedio</p>
          <p className="mt-1 text-lg font-semibold">{formatAmount(product.averageCost)}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Unidad</p>
          <p className="mt-1 text-lg font-semibold">{product.unitCode}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Estado</p>
          <p className="mt-1 text-lg font-semibold">{product.isActive ? 'Activo' : 'Inactivo'}</p>
        </CardContent></Card>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <Tabs defaultValue="data">
              <TabsList className="w-full flex-nowrap overflow-x-auto sm:w-auto">
                <TabsTrigger value="data">Datos</TabsTrigger>
                <TabsTrigger value="units">Presentaciones</TabsTrigger>
                <TabsTrigger value="stock">Existencia</TabsTrigger>
                <TabsTrigger value="movements">Movimientos</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                <ProductDetailsTab product={product} />
              </TabsContent>

              <TabsContent value="units" className="mt-4">
                <ProductUnitsTab product={product} />
              </TabsContent>

              <TabsContent value="stock" className="mt-4">
                {!product.tracksInventory && (
                  <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Este producto no lleva control de existencia — actívalo en "Datos" para poder ajustar existencia o registrar uso interno.
                  </p>
                )}
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {institutions && institutions.length > 1 && (
                    <div className="space-y-1.5">
                      <Label>Institución</Label>
                      <Select value={institutionId} onValueChange={(v) => { setInstitutionId(v); setBranchId(''); }}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una institución" /></SelectTrigger>
                        <SelectContent>
                          {institutions.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Sucursal</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona una sucursal" /></SelectTrigger>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-4 overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Sucursal</TableHead><TableHead className="text-right">Existencia</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!stock || stock.length === 0) && (
                        <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sin existencia registrada.</TableCell></TableRow>
                      )}
                      {stock?.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.branch.name}</TableCell>
                          <TableCell className="text-right">{row.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {product.tracksInventory && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Ajustar existencia</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="quantityDelta">Cantidad (+ entra, - sale)</Label>
                        <Input id="quantityDelta" type="number" step="0.001" value={quantityDelta} onChange={(e) => setQuantityDelta(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="unitCost">Costo unitario (opcional)</Label>
                        <Input id="unitCost" type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="adjustNotes">Motivo</Label>
                      <Input id="adjustNotes" placeholder="Conteo físico de fin de mes..." value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
                    </div>
                    <Button
                      type="button" size="sm" onClick={handleAdjust}
                      disabled={adjustMutation.isPending || !branchId || !quantityDelta || !adjustNotes.trim()}
                    >
                      {adjustMutation.isPending ? 'Ajustando...' : 'Ajustar'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="movements" className="mt-4">
                <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!movements || movements.length === 0) && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin movimientos todavía.</TableCell></TableRow>
                      )}
                      {movements?.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(movement.createdAt)}</TableCell>
                          <TableCell>{movement.branch.name}</TableCell>
                          <TableCell>{MOVEMENT_TYPE_LABELS[movement.movementType]}</TableCell>
                          <TableCell className={`text-right ${Number(movement.quantity) < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {Number(movement.quantity) > 0 ? '+' : ''}{movement.quantity}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={movement.notes ?? ''}>{movement.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {product.tracksInventory && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Registrar uso interno</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="consumeQuantity">Cantidad</Label>
                        <Input id="consumeQuantity" type="number" step="0.001" min="0" value={consumeQuantity} onChange={(e) => setConsumeQuantity(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="expenseAccountId">Cuenta de gasto</Label>
                        <Combobox
                          id="expenseAccountId"
                          options={expenseAccounts}
                          value={expenseAccountId}
                          onChange={setExpenseAccountId}
                          getOptionValue={(account) => account.id}
                          getOptionLabel={(account) => `${account.code} — ${account.name}`}
                          placeholder="Selecciona una cuenta"
                          searchPlaceholder="Buscar por código o nombre..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="consumeNotes">Motivo</Label>
                      <Input id="consumeNotes" placeholder="Culto Dominical 2026-09-06..." value={consumeNotes} onChange={(e) => setConsumeNotes(e.target.value)} />
                    </div>
                    <Button
                      type="button" size="sm" onClick={handleConsume}
                      disabled={consumeMutation.isPending || !branchId || !consumeQuantity || !expenseAccountId || !consumeNotes.trim()}
                    >
                      {consumeMutation.isPending ? 'Registrando...' : 'Registrar'}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
