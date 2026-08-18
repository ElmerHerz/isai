import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { Landmark } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { useGroupFundsSummaryQuery } from '@/modules/finanzas';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/finance/group-funds/')({
  component: GroupFundsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function formatAmount(amount: string) {
  return `$${Number(amount).toFixed(2)}`;
}

function GroupFundsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const navigate = useNavigate();
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  const { data: groups, isLoading, isError, refetch } = useGroupFundsSummaryQuery(institutionId);

  return (
    <div>
      <PageHeader
        icon={Landmark}
        title="Fondos de Grupo"
        description="Dinero que un grupo maneja por su cuenta, separado de la caja general (ej. el fondo de equipo de un ministerio)."
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {institutions && institutions.length > 1 && (
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
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
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}

            {isError && (
              <div className="p-4">
                <QueryErrorState message="No se pudieron cargar los fondos de grupo." onRetry={() => refetch()} />
              </div>
            )}

            {!isLoading && !isError && groups?.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No tienes alcance sobre ningún grupo todavía.
              </p>
            )}

            {!isLoading &&
              !isError &&
              groups?.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => navigate({ to: '/finance/group-funds/$groupId', params: { groupId: group.id } })}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{group.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.groupType.name}
                      {!group.cashAccountId && ' · Sin cuenta de caja configurada'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold',
                      Number(group.balance) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {formatAmount(group.balance)}
                  </span>
                </button>
              ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden max-h-[70vh] overflow-y-auto sm:block">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="hover:bg-transparent">
                  <TableHead style={headStyle}>Grupo</TableHead>
                  <TableHead style={headStyle}>Tipo</TableHead>
                  <TableHead style={headStyle}>Cuenta de caja</TableHead>
                  <TableHead style={headStyle} className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeletonRows columns={4} />}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <QueryErrorState message="No se pudieron cargar los fondos de grupo." onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && groups?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No tienes alcance sobre ningún grupo todavía.
                    </TableCell>
                  </TableRow>
                )}

                {groups?.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: '/finance/group-funds/$groupId', params: { groupId: group.id } })}
                  >
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.groupType.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.cashAccount ? `${group.cashAccount.code} · ${group.cashAccount.name}` : 'Sin configurar'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold',
                        Number(group.balance) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {formatAmount(group.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
