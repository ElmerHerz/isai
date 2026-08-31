import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRemoveProductUnitMutation } from '@/modules/inventario';
import { AddProductUnitPanel } from './add-product-unit-panel';
import { UNIT_OPTIONS } from './product-form-fields';
import type { Product, ProductUnit } from '@isai/shared-types';

function unitLabel(code: string) {
  return UNIT_OPTIONS.find((u) => u.code === code)?.label ?? code;
}

function formatAmount(value: string | number) {
  return `$${Number(value).toFixed(2)}`;
}

interface ProductUnitsTabProps {
  product: Product;
}

// Presentaciones de compra/venta adicionales a la unidad base (Caja, Fardo,
// Docena...) — se agregan/quitan una a la vez, sin edición, mismo criterio
// que las líneas de una Compra.
export function ProductUnitsTab({ product }: ProductUnitsTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removingUnit, setRemovingUnit] = useState<ProductUnit | null>(null);
  const removeMutation = useRemoveProductUnitMutation(product.id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          La unidad base de este producto es <strong>{unitLabel(product.unitCode)}</strong> — acá se agregan otras
          presentaciones para comprarlo/venderlo también así (ej. Caja, Fardo, Docena).
        </p>
      </div>

      {!addOpen && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar presentación
          </Button>
        </div>
      )}

      {addOpen && <AddProductUnitPanel product={product} onDone={() => setAddOpen(false)} />}

      {product.units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este producto solo se compra/vende por {unitLabel(product.unitCode)}.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Presentación</TableHead>
              <TableHead className="text-right">Equivale a</TableHead>
              <TableHead className="text-right">Precio de venta</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>{unitLabel(unit.unitCode)}</TableCell>
                <TableCell className="text-right">
                  {unit.conversionToBase} {unitLabel(product.unitCode)}
                </TableCell>
                <TableCell className="text-right">
                  {unit.salePrice == null ? 'Solo se compra' : formatAmount(unit.salePrice)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setRemovingUnit(unit)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!removingUnit}
        onOpenChange={(open) => !open && setRemovingUnit(null)}
        title="¿Quitar esta presentación?"
        description={
          removingUnit
            ? `Ya no se podrá comprar/vender "${product.name}" por ${unitLabel(removingUnit.unitCode)}. No afecta la existencia ya registrada.`
            : ''
        }
        isPending={removeMutation.isPending}
        onConfirm={() => {
          if (removingUnit) {
            removeMutation.mutate(removingUnit.id, { onSuccess: () => setRemovingUnit(null) });
          }
        }}
      />
    </div>
  );
}
