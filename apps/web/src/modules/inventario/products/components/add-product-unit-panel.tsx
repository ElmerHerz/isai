import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAddProductUnitMutation } from '@/modules/inventario';
import { UNIT_OPTIONS } from './product-form-fields';
import { getErrorMessage } from '@/lib/toast';
import type { Product } from '@isai/shared-types';

interface AddProductUnitPanelProps {
  product: Product;
  onDone: () => void;
}

export function AddProductUnitPanel({ product, onDone }: AddProductUnitPanelProps) {
  const mutation = useAddProductUnitMutation(product.id);
  const usedCodes = new Set([product.unitCode, ...product.units.map((u) => u.unitCode)]);
  const availableUnits = UNIT_OPTIONS.filter((u) => !usedCodes.has(u.code));

  const [unitCode, setUnitCode] = useState('');
  const [conversionToBase, setConversionToBase] = useState('');
  const [salePrice, setSalePrice] = useState('');

  const parsedConversion = Number(conversionToBase);
  const isConversionValid = conversionToBase.trim() !== '' && Number.isFinite(parsedConversion) && parsedConversion > 0;
  const canSubmit = !!unitCode && isConversionValid;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { unitCode, conversionToBase: parsedConversion, salePrice: salePrice ? Number(salePrice) : undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Agregar presentación</h3>
          <p className="text-xs text-muted-foreground">
            Ej. "Caja" con 6 {product.unitCode.toLowerCase()} — para comprar/vender este producto también en esa presentación.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {availableUnits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay más unidades disponibles (o ya están todas agregadas).</p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="product-unit-code">Unidad</Label>
            <Select value={unitCode} onValueChange={setUnitCode}>
              <SelectTrigger id="product-unit-code">
                <SelectValue placeholder="Selecciona una unidad" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit.code} value={unit.code}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="product-unit-conversion">Cuántas {product.unitCode.toLowerCase()} trae</Label>
          <Input
            id="product-unit-conversion"
            type="number"
            min="0"
            step="0.001"
            placeholder="36"
            value={conversionToBase}
            onChange={(e) => setConversionToBase(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-unit-sale-price">Precio de venta (opcional)</Label>
          <Input
            id="product-unit-sale-price"
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Vacío = esta presentación no se vende entera, solo se compra.</p>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo agregar. Verifica los datos e intenta de nuevo.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
