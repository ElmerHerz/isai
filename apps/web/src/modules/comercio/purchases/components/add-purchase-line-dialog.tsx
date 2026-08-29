import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useProductsQuery } from '@/modules/inventario';
import { UNIT_OPTIONS } from '@/modules/inventario/products/components/product-form-fields';
import { useAddPurchaseLineMutation } from '@/modules/comercio';
import { getErrorMessage } from '@/lib/toast';

interface AddPurchaseLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
}

function unitLabel(code: string) {
  return UNIT_OPTIONS.find((u) => u.code === code)?.label ?? code;
}

export function AddPurchaseLineDialog({ open, onOpenChange, purchaseId }: AddPurchaseLineDialogProps) {
  const { data: products } = useProductsQuery();
  const purchasableProducts = products?.filter((p) => p.tracksInventory && p.isActive) ?? [];
  const mutation = useAddPurchaseLineMutation(purchaseId);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  // Código de la unidad base o de una de product.units — con qué presentación
  // se está capturando esta línea. Se convierte a la unidad base del
  // producto antes de enviar; el backend siempre recibe cantidad/costo ya en
  // unitCode base, nunca se entera de que existen presentaciones.
  const [captureUnitCode, setCaptureUnitCode] = useState('');

  useEffect(() => {
    if (open) {
      setProductId('');
      setQuantity('');
      setUnitCost('');
      setCaptureUnitCode('');
    }
  }, [open]);

  const selectedProduct = purchasableProducts.find((p) => p.id === productId);

  // Opciones para capturar la línea: la unidad base (conversión 1) + cada
  // presentación adicional del producto (Caja, Fardo...).
  const captureOptions = selectedProduct
    ? [
        { code: selectedProduct.unitCode, conversionToBase: 1 },
        ...selectedProduct.units.map((u) => ({ code: u.unitCode, conversionToBase: Number(u.conversionToBase) })),
      ]
    : [];

  useEffect(() => {
    if (selectedProduct) setCaptureUnitCode(selectedProduct.unitCode);
  }, [selectedProduct]);

  const conversionToBase = captureOptions.find((o) => o.code === captureUnitCode)?.conversionToBase ?? 1;
  const usingAltUnit = conversionToBase !== 1;

  const parsedQuantity = Number(quantity);
  const parsedUnitCost = Number(unitCost);
  const isQuantityValid = quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const isUnitCostValid = unitCost.trim() !== '' && Number.isFinite(parsedUnitCost) && parsedUnitCost >= 0;
  const canSubmit = !!productId && isQuantityValid && isUnitCostValid;

  const actualQuantity = parsedQuantity * conversionToBase;
  // Redondeado a 2 decimales — misma precisión que ya usa unit_cost en la
  // base (Decimal(14,2)), para no mostrar un costo "de mentira" más preciso
  // que lo que en realidad se va a guardar.
  const actualUnitCost = Math.round((parsedUnitCost / conversionToBase) * 100) / 100;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { productId, quantity: actualQuantity, unitCost: actualUnitCost },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar línea</DialogTitle>
          <DialogDescription>Un producto, cuánto se compró y a qué costo unitario.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {purchasableProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos con control de existencia disponibles.</p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="purchase-line-product">Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="purchase-line-product">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {purchasableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku ? `${product.sku} · ${product.name}` : product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedProduct && captureOptions.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="purchase-line-capture-unit">Comprar por</Label>
              <Select value={captureUnitCode} onValueChange={setCaptureUnitCode}>
                <SelectTrigger id="purchase-line-capture-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {captureOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {unitLabel(option.code)}
                      {option.conversionToBase !== 1 && ` (${option.conversionToBase} ${unitLabel(selectedProduct.unitCode)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchase-line-quantity">
                {usingAltUnit ? `Cantidad de ${unitLabel(captureUnitCode)}` : 'Cantidad'}
              </Label>
              <Input
                id="purchase-line-quantity"
                type="number"
                min="0"
                step="0.001"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-line-unit-cost">
                {usingAltUnit ? `Costo por ${unitLabel(captureUnitCode)}` : 'Costo unitario'}
              </Label>
              <Input
                id="purchase-line-unit-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="2.50"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {usingAltUnit && isQuantityValid && isUnitCostValid && selectedProduct && (
            <p className="text-xs text-muted-foreground">
              = {actualQuantity} {unitLabel(selectedProduct.unitCode)} a ${actualUnitCost.toFixed(2)} c/u
            </p>
          )}

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
