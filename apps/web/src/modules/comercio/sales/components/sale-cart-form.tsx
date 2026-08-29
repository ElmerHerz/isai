import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DateInput } from '@/components/ui/date-input';
import { useBranchesQuery } from '@/modules/general';
import { useProductsQuery } from '@/modules/inventario';
import { UNIT_OPTIONS } from '@/modules/inventario/products/components/product-form-fields';
import { useCustomersQuery, useCreateSaleMutation } from '@/modules/comercio';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { todayLocalDateInput } from '@/lib/format-date';
import type { Product } from '@isai/shared-types';

const CONSUMIDOR_FINAL_SENTINEL = '__consumidor_final__';

function unitLabel(code: string) {
  return UNIT_OPTIONS.find((u) => u.code === code)?.label ?? code;
}

interface CartLine {
  key: string;
  productId: string;
  productLabel: string;
  captureLabel: string;
  quantity: number;
  unitPrice: number;
}

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

interface SaleCartFormProps {
  institutionId: string;
}

// Pantalla de carrito de una Venta — todo en memoria hasta "Cobrar" (a
// diferencia de Compras, que agrega líneas una a la vez contra el backend):
// una venta nace atómica (encabezado + líneas + folio + existencia + asiento
// contable, todo en un solo POST /sales), así que no tiene sentido persistir
// nada hasta el momento de cobrar.
export function SaleCartForm({ institutionId }: SaleCartFormProps) {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: customers } = useCustomersQuery();
  const { data: products } = useProductsQuery();
  const createMutation = useCreateSaleMutation();

  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState(CONSUMIDOR_FINAL_SENTINEL);
  const [saleDate, setSaleDate] = useState(todayLocalDateInput());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'credit'>('cash');
  const [documentType, setDocumentType] = useState<'receipt' | 'invoice'>('receipt');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Solo productos vendibles: precio de venta propio o de al menos una
  // presentación — un producto de solo uso interno (salePrice null en todo)
  // no debería aparecer acá.
  const sellableProducts = (products ?? []).filter(
    (p) => p.isActive && (p.salePrice != null || p.units.some((u) => u.salePrice != null)),
  );

  const [productId, setProductId] = useState('');
  const selectedProduct = sellableProducts.find((p) => p.id === productId);

  // Solo presentaciones con precio propio pueden usarse para vender — a
  // diferencia de Compras, donde cualquier presentación sirve (el costo no
  // depende de tener un salePrice configurado).
  function getCaptureOptions(product: Product) {
    return [
      ...(product.salePrice != null ? [{ code: product.unitCode, conversionToBase: 1, defaultPrice: Number(product.salePrice) }] : []),
      ...product.units
        .filter((u) => u.salePrice != null)
        .map((u) => ({ code: u.unitCode, conversionToBase: Number(u.conversionToBase), defaultPrice: Number(u.salePrice) })),
    ];
  }

  const captureOptions = selectedProduct ? getCaptureOptions(selectedProduct) : [];

  const [captureUnitCode, setCaptureUnitCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const onSelectProduct = (id: string) => {
    setProductId(id);
    const product = sellableProducts.find((p) => p.id === id);
    const firstOption = product ? getCaptureOptions(product)[0] : undefined;
    if (firstOption) {
      setCaptureUnitCode(firstOption.code);
      setUnitPrice(String(firstOption.defaultPrice));
    } else {
      setCaptureUnitCode('');
      setUnitPrice('');
    }
    setQuantity('');
  };

  const onSelectCaptureUnit = (code: string) => {
    setCaptureUnitCode(code);
    const option = captureOptions.find((o) => o.code === code);
    if (option) setUnitPrice(String(option.defaultPrice));
  };

  const conversionToBase = captureOptions.find((o) => o.code === captureUnitCode)?.conversionToBase ?? 1;
  const parsedQuantity = Number(quantity);
  const parsedUnitPrice = Number(unitPrice);
  const isQuantityValid = quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const isUnitPriceValid = unitPrice.trim() !== '' && Number.isFinite(parsedUnitPrice) && parsedUnitPrice >= 0;
  const canAddToCart = !!selectedProduct && !!captureUnitCode && isQuantityValid && isUnitPriceValid;

  const addToCart = () => {
    if (!canAddToCart || !selectedProduct) return;
    const actualQuantity = parsedQuantity * conversionToBase;
    const actualUnitPrice = Math.round((parsedUnitPrice / conversionToBase) * 100) / 100;
    setCart((prev) => [
      ...prev,
      {
        key: `${selectedProduct.id}-${Date.now()}`,
        productId: selectedProduct.id,
        productLabel: selectedProduct.sku ? `${selectedProduct.sku} · ${selectedProduct.name}` : selectedProduct.name,
        captureLabel:
          conversionToBase !== 1
            ? `${quantity} ${unitLabel(captureUnitCode)} = ${actualQuantity} ${unitLabel(selectedProduct.unitCode)}`
            : `${actualQuantity} ${unitLabel(selectedProduct.unitCode)}`,
        quantity: actualQuantity,
        unitPrice: actualUnitPrice,
      },
    ]);
    setProductId('');
    setCaptureUnitCode('');
    setQuantity('');
    setUnitPrice('');
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((line) => line.key !== key));
  };

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const canCheckout = !!branchId && cart.length > 0 && !createMutation.isPending;

  const onCheckout = () => {
    if (!canCheckout) return;
    createMutation.mutate(
      {
        institutionId,
        branchId,
        customerId: customerId === CONSUMIDOR_FINAL_SENTINEL ? undefined : customerId,
        saleDate,
        paymentMethod,
        documentType,
        notes: notes || undefined,
        lines: cart.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })),
      },
      {
        onSuccess: (sale) => navigate({ to: '/store/sales/$saleId', params: { saleId: sale.id } }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="mt-6 rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">Encabezado</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branchId">
                  <SelectValue placeholder="Selecciona una sucursal" />
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

            <div className="space-y-2">
              <Label htmlFor="customerId">Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customerId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CONSUMIDOR_FINAL_SENTINEL}>Consumidor Final</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleDate">Fecha</Label>
              <DateInput id="saleDate" value={saleDate} onChange={setSaleDate} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de pago</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Contado</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de documento</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as typeof documentType)}>
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Recibo</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">Agregar producto</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="cart-product">Producto</Label>
              <Select value={productId} onValueChange={onSelectProduct}>
                <SelectTrigger id="cart-product">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {sellableProducts.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku ? `${product.sku} · ${product.name}` : product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {captureOptions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="cart-capture-unit">Vender por</Label>
                <Select value={captureUnitCode} onValueChange={onSelectCaptureUnit}>
                  <SelectTrigger id="cart-capture-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {captureOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {unitLabel(option.code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cart-quantity">Cantidad</Label>
              <Input
                id="cart-quantity"
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cart-price">Precio unitario</Label>
              <Input
                id="cart-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addToCart} disabled={!canAddToCart}>
              <Plus className="mr-1.5 h-4 w-4" /> Agregar al carrito
            </Button>
          </div>

          {sellableProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay productos con precio de venta configurado.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Carrito</h2>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay productos en el carrito.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell>{line.productLabel}</TableCell>
                    <TableCell>{line.captureLabel}</TableCell>
                    <TableCell className="text-right">{formatAmount(line.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatAmount(line.quantity * line.unitPrice)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(line.key)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatAmount(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}

          {createMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {getErrorMessage(createMutation.error, 'No se pudo registrar la venta. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={onCheckout} disabled={!canCheckout}>
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {createMutation.isPending ? 'Cobrando...' : 'Cobrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
