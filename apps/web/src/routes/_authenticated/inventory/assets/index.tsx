import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Warehouse, Plus } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useAssetsQuery } from '@/modules/inventario';
import { AssetFormDialog } from '@/modules/inventario/assets/components/asset-form-dialog';
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

export const Route = createFileRoute('/_authenticated/inventory/assets/')({
  component: AssetsPage,
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

function AssetsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) setInstitutionId(institutions[0]!.id);
  }, [institutions, institutionId]);

  const { data: assets, isLoading, isError, refetch } = useAssetsQuery(institutionId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        icon={Warehouse}
        title="Activos"
        description="Equipo y mobiliario duradero — quién lo tiene, dónde está, en qué estado."
        action={
          <Button variant="translucent" onClick={() => setCreateOpen(true)} disabled={!institutionId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo activo
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {institutions && institutions.length > 1 && (
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

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
                <QueryErrorState message="No se pudieron cargar los activos." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && assets?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Todavía no hay activos.</p>
            )}

            {!isLoading &&
              !isError &&
              assets?.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => navigate({ to: '/inventory/assets/$assetId', params: { assetId: asset.id } })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{asset.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{CONDITION_LABELS[asset.condition]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {asset.location ?? 'Sin ubicación'} · {asset.custodianPerson ? `${asset.custodianPerson.firstName} ${asset.custodianPerson.lastName}` : 'Sin custodio'}
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
                  <TableHead style={headStyle}>Categoría</TableHead>
                  <TableHead style={headStyle} className="text-right">Cantidad</TableHead>
                  <TableHead style={headStyle}>Ubicación</TableHead>
                  <TableHead style={headStyle}>Custodio</TableHead>
                  <TableHead style={headStyle}>Condición</TableHead>
                  <TableHead style={headStyle}>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={7} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <QueryErrorState message="No se pudieron cargar los activos." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && assets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Todavía no hay activos.
                    </TableCell>
                  </TableRow>
                )}

                {assets?.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/inventory/assets/$assetId', params: { assetId: asset.id } })}
                  >
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.categoryCode ?? '—'}</TableCell>
                    <TableCell className="text-right">{asset.quantity}</TableCell>
                    <TableCell>{asset.location ?? '—'}</TableCell>
                    <TableCell>{asset.custodianPerson ? `${asset.custodianPerson.firstName} ${asset.custodianPerson.lastName}` : '—'}</TableCell>
                    <TableCell>{CONDITION_LABELS[asset.condition]}</TableCell>
                    <TableCell>{asset.isActive ? 'Activo' : 'Dado de baja'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {institutionId && <AssetFormDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />}
    </div>
  );
}
