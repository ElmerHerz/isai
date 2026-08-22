import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { BarChart3, AlertTriangle, TrendingUp, Building2, ListFilter } from 'lucide-react';
import { useInstitutionsQuery, useBranchesQuery } from '@/modules/general';
import {
  useAttendanceTrendQuery,
  useAttendanceByBranchQuery,
  useAttendanceAbsencesQuery,
  useReportSchedulesQuery,
  useGroupsQuery,
} from '@/modules/membresia';
import { AttendanceTrendChart } from '@/modules/membresia/reports/attendance-trend-chart';
import { AttendanceByBranchChart } from '@/modules/membresia/reports/attendance-by-branch-chart';
import { ATTENDANCE_STATUS_META, ATTENDANCE_STATUS_ORDER, type AttendanceStatusKey } from '@/modules/membresia/reports/attendance-status';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useIsDarkMode } from '@/lib/theme-store';
import type { AttendanceByBranchRow } from '@isai/shared-types';

export const Route = createFileRoute('/_authenticated/membership/reports')({
  component: MembershipReportsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const KEY_TO_FIELD: Record<AttendanceStatusKey, keyof AttendanceByBranchRow> = {
  present: 'present',
  late: 'late',
  absent: 'absent',
  excused: 'excused',
};

const ALL_VALUE = '__all__';

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function MembershipReportsPage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const isDark = useIsDarkMode();

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  // useBranchesQuery ya devuelve solo las sucursales dentro del alcance del
  // usuario (resolveBranchScope, server-side) — un rol de UNA sucursal
  // (ej. Pastor) recibe una sola fila acá, así que el selector de Sucursal
  // ni se muestra (nada que elegir) y esa única sucursal queda fija: el
  // backend además la hace cumplir de todos modos aunque alguien fuerce el
  // query param a mano, ver MembershipReportsService.resolveEffectiveBranchIds.
  const { data: branches } = useBranchesQuery(institutionId);
  const { data: groups } = useGroupsQuery(institutionId);
  const { data: schedules } = useReportSchedulesQuery(institutionId);

  const [branchId, setBranchId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canPickBranch = (branches?.length ?? 0) > 1;

  useEffect(() => {
    if (!canPickBranch && branches?.length === 1 && branchId !== branches[0]!.id) {
      setBranchId(branches[0]!.id);
    }
  }, [canPickBranch, branches, branchId]);

  // Elegir un horario ya implica su sucursal — evita el caso confuso de
  // combinar un horario de una sucursal con el filtro de OTRA sucursal
  // distinta (que siempre daría "sin datos").
  useEffect(() => {
    if (!scheduleId) return;
    const schedule = schedules?.find((s) => s.id === scheduleId);
    if (schedule) setBranchId(schedule.branchId);
  }, [scheduleId, schedules]);

  // Grupo/Horario en cascada: si hay sucursal elegida, solo se ofrecen sus
  // propias opciones (un grupo con branchId null es "de toda la
  // institución", sigue aplicando a cualquier sucursal).
  const filteredGroups = useMemo(
    () => (groups ?? []).filter((g) => !branchId || !g.branchId || g.branchId === branchId),
    [groups, branchId],
  );
  const filteredSchedules = useMemo(
    () => (schedules ?? []).filter((s) => !branchId || s.branchId === branchId),
    [schedules, branchId],
  );

  const onBranchChange = (v: string) => {
    const next = v === ALL_VALUE ? '' : v;
    setBranchId(next);
    // Grupo/horario elegidos podrían ya no pertenecer a la nueva sucursal.
    setGroupId('');
    setScheduleId('');
  };

  const baseFilters = {
    groupId: groupId || undefined,
    scheduleId: scheduleId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  const trendFilters = { ...baseFilters, branchId: branchId || undefined };
  const branchChartFilters = baseFilters;

  const { data: trend, isLoading: isTrendLoading } = useAttendanceTrendQuery(institutionId, trendFilters);
  const { data: byBranch, isLoading: isByBranchLoading } = useAttendanceByBranchQuery(institutionId, branchChartFilters);
  const { data: absences, isLoading: isAbsencesLoading } = useAttendanceAbsencesQuery(institutionId, 10, trendFilters);

  const breakdown = useMemo(() => {
    const totals: Record<AttendanceStatusKey, number> = { present: 0, late: 0, absent: 0, excused: 0 };
    let grandTotal = 0;
    for (const row of byBranch ?? []) {
      for (const key of ATTENDANCE_STATUS_ORDER) {
        totals[key] += row[KEY_TO_FIELD[key]] as number;
      }
      grandTotal += row.total;
    }
    return { totals, grandTotal: grandTotal || 1 };
  }, [byBranch]);

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Reportes de Asistencia"
        description="Tendencia, comparativa por sucursal e inasistencia recurrente."
      />

      {/* --- Filtros --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListFilter className="h-3.5 w-3.5" />
              Filtros
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {institutions && institutions.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Institución</Label>
                  <Select value={institutionId} onValueChange={setInstitutionId}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Institución" /></SelectTrigger>
                    <SelectContent>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {canPickBranch && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sucursal</Label>
                  <Select value={branchId || ALL_VALUE} onValueChange={onBranchChange}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Sucursal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Todas las sucursales</SelectItem>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Grupo</Label>
                <Select value={groupId || ALL_VALUE} onValueChange={(v) => setGroupId(v === ALL_VALUE ? '' : v)}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos los grupos</SelectItem>
                    {filteredGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Horario</Label>
                <Select value={scheduleId || ALL_VALUE} onValueChange={(v) => setScheduleId(v === ALL_VALUE ? '' : v)}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Horario" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos los horarios</SelectItem>
                    {filteredSchedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {canPickBranch ? `${s.branchName} · ${s.label}` : s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <DateInput value={startDate} onChange={setStartDate} className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <DateInput value={endDate} onChange={setEndDate} className="w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Tendencia --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <CollapsibleSection icon={TrendingUp} title="% de asistencia por culto" defaultOpen>
              {isTrendLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <AttendanceTrendChart points={trend ?? []} isDark={isDark} />
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Comparativa por sucursal + Desglose global --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-3">
          <CardContent className="p-5">
            <CollapsibleSection icon={Building2} title="Comparativa por sucursal" defaultOpen={false}>
              {isByBranchLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <AttendanceByBranchChart rows={byBranch ?? []} isDark={isDark} />
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="p-5">
            <CollapsibleSection icon={BarChart3} title="Desglose global" defaultOpen={false}>
              {isByBranchLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {ATTENDANCE_STATUS_ORDER.map((key) => {
                    const meta = ATTENDANCE_STATUS_META[key];
                    const Icon = meta.icon;
                    const value = breakdown.totals[key];
                    const pct = (value / breakdown.grandTotal) * 100;
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                            {meta.label}
                          </span>
                          <span className="text-muted-foreground">{value} · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- Inasistencia recurrente --- */}
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-4">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <CollapsibleSection icon={AlertTriangle} title="Inasistencia recurrente" defaultOpen={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                De los últimos 8 cultos registrados en su sucursal, personas con 2 o más ausencias.
              </p>

              {isAbsencesLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {!isAbsencesLoading && absences?.length === 0 && (
                <p className="text-sm text-muted-foreground">Nadie tiene 2 o más ausencias recientes — buena señal.</p>
              )}

              {!isAbsencesLoading && absences && absences.length > 0 && (
                <ul className="space-y-2">
                  {absences.map((row) => {
                    const rate = row.considered > 0 ? (row.absences / row.considered) * 100 : 0;
                    return (
                      <li key={row.personId} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          {initials(row.firstName, row.lastName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{row.firstName} {row.lastName}</p>
                            <span className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400">
                              {row.absences} de {row.considered}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-rose-500" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CollapsibleSection>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
