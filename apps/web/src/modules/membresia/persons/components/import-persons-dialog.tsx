import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCatalogItemsQuery, useBranchesQuery } from '@/modules/general';
import {
  usePreviewPersonsImportMutation,
  useConfirmPersonsImportMutation,
  downloadPersonsImportTemplate,
} from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/toast';
import type { ImportPreviewRow } from '@isai/shared-types';

interface ImportPersonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
}

const STATUS_STYLES: Record<ImportPreviewRow['status'], { label: string; className: string }> = {
  ok: { label: 'Se creará', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  duplicate: {
    label: 'Posible duplicado',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  invalid: { label: 'Inválida', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
};

export function ImportPersonsDialog({ open, onOpenChange, institutionId }: ImportPersonsDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: personTypes } = useCatalogItemsQuery('person_type');
  const previewMutation = usePreviewPersonsImportMutation();
  const confirmMutation = useConfirmPersonsImportMutation();

  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState('');
  const [personTypeId, setPersonTypeId] = useState('');
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setStep('upload');
      setFile(null);
      setBranchId('');
      setPreviewRows([]);
      setSelectedRows(new Set());
    }
  }, [open]);

  // Por defecto el tipo "Miembro" del catálogo, si existe — el usuario
  // puede cambiarlo (ej. para importar un lote de Empleados/Voluntarios).
  useEffect(() => {
    if (open && personTypes && !personTypeId) {
      const member = personTypes.find((t) => t.code === 'MEMBER');
      setPersonTypeId(member?.id ?? personTypes[0]?.id ?? '');
    }
  }, [open, personTypes, personTypeId]);

  const onPreview = () => {
    if (!file || !personTypeId) return;
    previewMutation.mutate(
      { file, institutionId, branchId: branchId || undefined },
      {
        onSuccess: (rows) => {
          setPreviewRows(rows);
          setSelectedRows(new Set(rows.filter((r) => r.status === 'ok').map((r) => r.rowNumber)));
          setStep('preview');
        },
      },
    );
  };

  const toggleRow = (rowNumber: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const onConfirm = () => {
    const rows = previewRows
      .filter((r) => selectedRows.has(r.rowNumber))
      .map((r) => ({ firstName: r.firstName, lastName: r.lastName }));

    confirmMutation.mutate(
      { institutionId, branchId: branchId || undefined, personTypeId, rows },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 'preview' ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>Importar personas desde Excel</DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Sube un archivo con los nombres y apellidos. La categoría elegida abajo aplica a todo el lote.'
              : `Revisa el resultado antes de confirmar — ${selectedRows.size} de ${previewRows.length} se importarán.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void downloadPersonsImportTemplate()}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla
            </button>

            <div className="space-y-2">
              <Label htmlFor="import-type">Categoría para todo el lote</Label>
              <Select value={personTypeId} onValueChange={setPersonTypeId}>
                <SelectTrigger id="import-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {personTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-branch">Sucursal (opcional)</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="import-branch">
                  <SelectValue placeholder="Toda la institución" />
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
              <Label htmlFor="import-file">Archivo (.xlsx)</Label>
              <input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
              />
            </div>

            {previewMutation.isError && (
              <p className="text-sm text-destructive">
                {(previewMutation.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'No se pudo leer el archivo. Verifica el formato e intenta de nuevo.'}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                onClick={onPreview}
                disabled={!file || !personTypeId || previewMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {previewMutation.isPending ? 'Leyendo...' : 'Previsualizar'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {previewRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No se encontraron filas en el archivo — revisa que tenga datos además de los encabezados.
              </p>
            )}

            {previewRows.length > 0 && (
            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                {/* bg-muted sólido, no /80 con blur: mismo problema que
                    DialogHeader (ver components/ui/dialog.tsx) — los colores
                    en tailwind.config.js no soportan el modificador de
                    opacidad de forma confiable, y el texto de las filas
                    scrolleadas se veía pasar detrás del encabezado. */}
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="p-2 text-left font-medium">Nombre</th>
                    <th className="p-2 text-left font-medium">Estado</th>
                    <th className="p-2 text-left font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const status = STATUS_STYLES[row.status];
                    return (
                      <tr key={row.rowNumber} className="border-t">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedRows.has(row.rowNumber)}
                            onChange={() => toggleRow(row.rowNumber)}
                          />
                        </td>
                        <td className="p-2">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="p-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.className)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {row.status === 'duplicate' && row.duplicateOf
                            ? `Ya existe: ${row.duplicateOf.name}`
                            : (row.reason ?? '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {confirmMutation.isError && (
              <p className="text-sm text-destructive">
                {getErrorMessage(confirmMutation.error, 'No se pudo confirmar la importación. Intenta de nuevo.')}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={selectedRows.size === 0 || confirmMutation.isPending}
              >
                {confirmMutation.isPending ? 'Importando...' : `Confirmar importación (${selectedRows.size})`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
