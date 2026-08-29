import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Warehouse } from 'lucide-react';
import {
  useAssetQuery,
  useAssetMovementsQuery,
  useAssignCustodianMutation,
  useRelocateAssetMutation,
  useSetConditionMutation,
  useDisposeAssetMutation,
} from '@/modules/inventario';
import { AssetDetailsTab } from '@/modules/inventario/assets/components/asset-details-tab';
import { PersonPicker } from '@/modules/inventario/assets/components/person-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/format-date';
import type { AssetMovement } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/inventory/assets/$assetId')({
  component: AssetDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const CONDITION_LABELS: Record<string, string> = {
  good: 'Bueno',
  fair: 'Regular',
  damaged: 'Dañado',
  out_of_service: 'Fuera de servicio',
};

const MOVEMENT_TYPE_LABELS: Record<AssetMovement['movementType'], string> = {
  assigned: 'Asignado',
  returned: 'Devuelto',
  relocated: 'Reubicado',
  condition_change: 'Cambio de condición',
  disposed: 'Dado de baja',
};

function movementDescription(movement: AssetMovement) {
  if (movement.movementType === 'relocated') return `${movement.fromLocation ?? '—'} → ${movement.toLocation ?? '—'}`;
  return movement.notes ?? '—';
}

function AssetDetailPage() {
  const { assetId } = Route.useParams();
  const navigate = useNavigate();
  const { data: asset, isLoading, isError, refetch } = useAssetQuery(assetId);
  const { data: movements } = useAssetMovementsQuery(assetId);

  const assignMutation = useAssignCustodianMutation(assetId);
  const [custodianId, setCustodianId] = useState<string | undefined>(undefined);
  const [custodianName, setCustodianName] = useState<string | undefined>(undefined);
  const [assignNotes, setAssignNotes] = useState('');

  const relocateMutation = useRelocateAssetMutation(assetId);
  const [newLocation, setNewLocation] = useState('');
  const [relocateNotes, setRelocateNotes] = useState('');

  const conditionMutation = useSetConditionMutation(assetId);
  const [newCondition, setNewCondition] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');

  const disposeMutation = useDisposeAssetMutation(assetId);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposeNotes, setDisposeNotes] = useState('');

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }

  if (isError || !asset) {
    return <QueryErrorState message="No se pudo cargar el activo." onRetry={() => refetch()} />;
  }

  const handleAssign = (customCustodianId?: string | null) => {
    if (!assignNotes.trim()) return;
    // customCustodianId permite forzar el valor (ej. "Devolver") sin
    // depender del estado custodianId, que setCustodianId(undefined) no
    // actualiza a tiempo para esta misma llamada (setState es asíncrono).
    const targetCustodianId = customCustodianId !== undefined ? customCustodianId : (custodianId ?? null);
    assignMutation.mutate(
      { custodianPersonId: targetCustodianId, notes: assignNotes.trim() },
      { onSuccess: () => { setCustodianId(undefined); setCustodianName(undefined); setAssignNotes(''); } },
    );
  };

  const handleRelocate = () => {
    if (!newLocation.trim() || !relocateNotes.trim()) return;
    relocateMutation.mutate(
      { location: newLocation.trim(), notes: relocateNotes.trim() },
      { onSuccess: () => { setNewLocation(''); setRelocateNotes(''); } },
    );
  };

  const handleSetCondition = () => {
    if (!newCondition || !conditionNotes.trim()) return;
    conditionMutation.mutate(
      { condition: newCondition as 'good' | 'fair' | 'damaged' | 'out_of_service', notes: conditionNotes.trim() },
      { onSuccess: () => { setNewCondition(''); setConditionNotes(''); } },
    );
  };

  return (
    <div>
      <Link to="/inventory/assets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Activos
      </Link>

      <PageHeader
        icon={Warehouse}
        title={asset.name}
        description={`${asset.categoryCode ?? 'Sin categoría'} · ${asset.location ?? 'Sin ubicación'} · ${asset.custodianPerson ? `${asset.custodianPerson.firstName} ${asset.custodianPerson.lastName}` : 'Sin custodio'}`}
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Condición</p>
          <p className="mt-1 text-lg font-semibold">{CONDITION_LABELS[asset.condition]}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Cantidad</p>
          <p className="mt-1 text-lg font-semibold">{asset.quantity}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Estado</p>
          <p className="mt-1 text-lg font-semibold">{asset.isActive ? 'Activo' : 'Dado de baja'}</p>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Sucursal</p>
          <p className="mt-1 text-lg font-semibold">{asset.branch?.name ?? 'Toda la institución'}</p>
        </CardContent></Card>
      </motion.div>

      {asset.sourceSummary && (
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Vinculado a: {asset.sourceSummary.description} — ${Number(asset.sourceSummary.amount).toFixed(2)} — {formatDate(asset.sourceSummary.date)}
          </p>
        </motion.div>
      )}

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <Tabs defaultValue="data">
              <TabsList className="w-full flex-nowrap overflow-x-auto sm:w-auto">
                <TabsTrigger value="data">Datos</TabsTrigger>
                <TabsTrigger value="custody">Custodia y movimientos</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                <AssetDetailsTab asset={asset} />
              </TabsContent>

              <TabsContent value="custody" className="mt-4 space-y-6">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!movements || movements.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sin movimientos todavía.</TableCell></TableRow>
                      )}
                      {movements?.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(movement.createdAt)}</TableCell>
                          <TableCell>{MOVEMENT_TYPE_LABELS[movement.movementType]}</TableCell>
                          <TableCell className="max-w-[240px] truncate" title={movementDescription(movement)}>{movementDescription(movement)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Reasignar custodio</p>
                    <PersonPicker
                      institutionId={asset.institutionId}
                      value={custodianId}
                      onChange={(id, name) => { setCustodianId(id); setCustodianName(name); }}
                    />
                    {custodianId && <p className="text-xs text-muted-foreground">Seleccionado: {custodianName}</p>}
                    <div className="flex gap-2">
                      <Input placeholder="Motivo..." value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => handleAssign()} disabled={assignMutation.isPending || !assignNotes.trim()}>
                        {assignMutation.isPending ? 'Guardando...' : 'Asignar'}
                      </Button>
                      {asset.custodianPerson && (
                        <Button
                          type="button" size="sm" variant="outline"
                          onClick={() => handleAssign(null)}
                          disabled={assignMutation.isPending || !assignNotes.trim()}
                        >
                          Devolver (sin custodio)
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Reubicar</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="newLocation">Nueva ubicación</Label>
                      <Input id="newLocation" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="relocateNotes">Motivo</Label>
                      <Input id="relocateNotes" value={relocateNotes} onChange={(e) => setRelocateNotes(e.target.value)} />
                    </div>
                    <Button type="button" size="sm" onClick={handleRelocate} disabled={relocateMutation.isPending || !newLocation.trim() || !relocateNotes.trim()}>
                      {relocateMutation.isPending ? 'Guardando...' : 'Reubicar'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Cambiar condición</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="newCondition">Condición</Label>
                      <Select value={newCondition} onValueChange={setNewCondition}>
                        <SelectTrigger id="newCondition"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="conditionNotes">Motivo</Label>
                      <Input id="conditionNotes" value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} />
                    </div>
                    <Button type="button" size="sm" onClick={handleSetCondition} disabled={conditionMutation.isPending || !newCondition || !conditionNotes.trim()}>
                      {conditionMutation.isPending ? 'Guardando...' : 'Actualizar'}
                    </Button>
                  </div>
                </div>

                {asset.isActive && (
                  <div className="border-t pt-4">
                    <Button type="button" variant="delete" size="sm" onClick={() => setDisposeOpen(true)}>
                      Dar de baja
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={disposeOpen} onOpenChange={(open) => { setDisposeOpen(open); if (!open) setDisposeNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja</DialogTitle>
            <DialogDescription>{asset.name} — indica el motivo. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disposeNotes">Motivo</Label>
            <Input id="disposeNotes" value={disposeNotes} onChange={(e) => setDisposeNotes(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDisposeOpen(false)} disabled={disposeMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="delete"
              disabled={disposeMutation.isPending || !disposeNotes.trim()}
              onClick={() => {
                disposeMutation.mutate(disposeNotes.trim(), {
                  onSuccess: () => { setDisposeOpen(false); void navigate({ to: '/inventory/assets' }); },
                });
              }}
            >
              {disposeMutation.isPending ? 'Guardando...' : 'Dar de baja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
