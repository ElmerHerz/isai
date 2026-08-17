import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { List, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useCurrenciesQuery,
  useUpdateCurrencyMutation,
  useCountriesQuery,
  useUpdateCountryMutation,
  useLanguagesQuery,
  useInstitutionTypesQuery,
  useCatalogItemsQuery,
  useUpdateCatalogItemMutation,
  useTenantsQuery,
  useInstitutionsQuery,
} from '@/modules/general';
import {
  useAttendanceTagsQuery,
  useUpdateAttendanceTagMutation,
  useDeleteAttendanceTagMutation,
  useMilestoneTypesQuery,
  useUpdateMilestoneTypeMutation,
  useDeleteMilestoneTypeMutation,
  usePrivilegeTypesQuery,
  useUpdatePrivilegeTypeMutation,
  useDeletePrivilegeTypeMutation,
  useFundTypesQuery,
  useUpdateFundTypeMutation,
  useDeleteFundTypeMutation,
} from '@/modules/membresia';
import { useMeQuery } from '@/modules/security';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { TableSearch } from '@/components/ui/table-search';
import { ColumnFilter } from '@/components/ui/column-filter';
import { TablePagination } from '@/components/ui/table-pagination';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';
import { tintBackground, tintForeground } from '@/lib/color';
import { useIsDarkMode } from '@/lib/theme-store';
import { useSearchAndSort } from '@/lib/use-search-and-sort';
import { cn } from '@/lib/utils';
import { CurrencyFormDialog } from '@/modules/general/catalogs/components/currency-form-dialog';
import { CountryFormDialog } from '@/modules/general/catalogs/components/country-form-dialog';
import { LanguageFormDialog } from '@/modules/general/catalogs/components/language-form-dialog';
import { InstitutionTypeFormDialog } from '@/modules/general/catalogs/components/institution-type-form-dialog';
import { CatalogItemFormDialog } from '@/modules/general/catalogs/components/catalog-item-form-dialog';
import { AttendanceTagFormDialog } from '@/modules/membresia/attendance-tags/components/attendance-tag-form-dialog';
import { MilestoneTypeFormDialog } from '@/modules/membresia/milestone-types/components/milestone-type-form-dialog';
import { PrivilegeTypeFormDialog } from '@/modules/membresia/privilege-types/components/privilege-type-form-dialog';
import { FundTypeFormDialog } from '@/modules/membresia/fund-types/components/fund-type-form-dialog';
import type {
  Currency,
  Country,
  Language,
  InstitutionType,
  CatalogItem,
  AttendanceTag,
  MilestoneType,
  PrivilegeType,
  FundType,
} from '@isai/shared-types';

const SCHEDULE_TYPE_CATALOG_CODE = 'schedule_type';
const CHURCH_INSTITUTION_TYPE = 'church';

export const Route = createFileRoute('/_authenticated/general/catalogs')({
  component: CatalogsPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        active
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function CatalogsPage() {
  const { data: me } = useMeQuery();
  const isSuperadmin = !!me && !me.tenantId;
  // Las etiquetas de asistencia son propias de cada tenant (tabla con
  // tenant_id, no catalog_items) — un Administrador normal ya tiene su
  // tenant fijo en el JWT; superadmin no tiene tenant propio, por eso elige
  // uno con el selector de abajo antes de poder gestionar algo acá.
  const { data: tenants } = useTenantsQuery();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const canManageAttendanceTags =
    (!!me?.tenantId && !!me.roles?.includes('Administrador')) || (isSuperadmin && !!selectedTenantId);
  // Hitos espirituales: mismo criterio de administración que las etiquetas
  // de asistencia, pero además la pestaña solo aparece si el tenant activo
  // (el propio, o el elegido arriba si eres superadmin) tiene alguna
  // institución de tipo iglesia — no aplica al resto de rubros.
  const { data: institutionsForChurchCheck } = useInstitutionsQuery(
    isSuperadmin && selectedTenantId ? selectedTenantId : undefined,
  );
  const isChurchTenant =
    !isSuperadmin || !!selectedTenantId
      ? !!institutionsForChurchCheck?.some((i) => i.typeCode === CHURCH_INSTITUTION_TYPE)
      : false;
  const color = useCurrentModuleColor();
  const isDark = useIsDarkMode();
  const headStyle = { backgroundColor: tintBackground(color, isDark), color: tintForeground(color, isDark) };

  const [createOpen, setCreateOpen] = useState<
    | null
    | 'currency'
    | 'country'
    | 'language'
    | 'institution-type'
    | 'schedule-type'
    | 'attendance-tag'
    | 'milestone-type'
    | 'privilege-type'
    | 'fund-type'
  >(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [editingInstitutionType, setEditingInstitutionType] = useState<InstitutionType | null>(null);
  const [editingScheduleType, setEditingScheduleType] = useState<CatalogItem | null>(null);
  const [editingAttendanceTag, setEditingAttendanceTag] = useState<AttendanceTag | null>(null);
  const [deletingAttendanceTag, setDeletingAttendanceTag] = useState<AttendanceTag | null>(null);
  const [editingMilestoneType, setEditingMilestoneType] = useState<MilestoneType | null>(null);
  const [deletingMilestoneType, setDeletingMilestoneType] = useState<MilestoneType | null>(null);
  const [editingPrivilegeType, setEditingPrivilegeType] = useState<PrivilegeType | null>(null);
  const [deletingPrivilegeType, setDeletingPrivilegeType] = useState<PrivilegeType | null>(null);
  const [editingFundType, setEditingFundType] = useState<FundType | null>(null);
  const [deletingFundType, setDeletingFundType] = useState<FundType | null>(null);

  const currenciesQuery = useCurrenciesQuery();
  const updateCurrencyMutation = useUpdateCurrencyMutation();
  const countriesQuery = useCountriesQuery();
  const updateCountryMutation = useUpdateCountryMutation();
  const languagesQuery = useLanguagesQuery();
  const institutionTypesQuery = useInstitutionTypesQuery();
  const scheduleTypesQuery = useCatalogItemsQuery(SCHEDULE_TYPE_CATALOG_CODE);
  const updateScheduleTypeMutation = useUpdateCatalogItemMutation();
  const attendanceTagsQuery = useAttendanceTagsQuery(isSuperadmin ? selectedTenantId || undefined : undefined);
  const updateAttendanceTagMutation = useUpdateAttendanceTagMutation();
  const deleteAttendanceTagMutation = useDeleteAttendanceTagMutation();
  const milestoneTypesQuery = useMilestoneTypesQuery(isSuperadmin ? selectedTenantId || undefined : undefined);
  const updateMilestoneTypeMutation = useUpdateMilestoneTypeMutation();
  const deleteMilestoneTypeMutation = useDeleteMilestoneTypeMutation();
  const privilegeTypesQuery = usePrivilegeTypesQuery(isSuperadmin ? selectedTenantId || undefined : undefined);
  const updatePrivilegeTypeMutation = useUpdatePrivilegeTypeMutation();
  const deletePrivilegeTypeMutation = useDeletePrivilegeTypeMutation();
  const fundTypesQuery = useFundTypesQuery(isSuperadmin ? selectedTenantId || undefined : undefined);
  const updateFundTypeMutation = useUpdateFundTypeMutation();
  const deleteFundTypeMutation = useDeleteFundTypeMutation();

  const currencies = useSearchAndSort(
    currenciesQuery.data,
    (c) => `${c.code} ${c.name}`,
    {
      codigo: (c) => c.code,
      nombre: (c) => c.name,
      simbolo: (c) => c.symbol,
      decimales: (c) => c.decimalPlaces,
      estado: (c) => (c.isActive ? 1 : 0),
    },
    'codigo',
    {
      estado: (c) => (c.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const countries = useSearchAndSort(
    countriesQuery.data,
    (c) => `${c.code} ${c.name}`,
    {
      codigo: (c) => c.code,
      nombre: (c) => c.name,
      prefijo: (c) => c.phonePrefix ?? '',
      moneda: (c) => c.defaultCurrencyCode ?? '',
      estado: (c) => (c.isActive ? 1 : 0),
    },
    'codigo',
    {
      estado: (c) => (c.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const languages = useSearchAndSort(
    languagesQuery.data,
    (l) => `${l.code} ${l.name}`,
    { codigo: (l) => l.code, nombre: (l) => l.name },
    'codigo',
  );

  const institutionTypes = useSearchAndSort(
    institutionTypesQuery.data,
    (t) => `${t.code} ${t.name} ${t.description ?? ''}`,
    { codigo: (t) => t.code, nombre: (t) => t.name },
    'nombre',
  );

  const scheduleTypes = useSearchAndSort(
    scheduleTypesQuery.data,
    (t) => `${t.code} ${t.name}`,
    {
      codigo: (t) => t.code,
      nombre: (t) => t.name,
      estado: (t) => (t.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (t) => (t.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const attendanceTags = useSearchAndSort(
    attendanceTagsQuery.data,
    (t) => `${t.code} ${t.name}`,
    {
      codigo: (t) => t.code,
      nombre: (t) => t.name,
      estado: (t) => (t.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (t) => (t.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const milestoneTypes = useSearchAndSort(
    milestoneTypesQuery.data,
    (t) => `${t.code} ${t.name}`,
    {
      codigo: (t) => t.code,
      nombre: (t) => t.name,
      estado: (t) => (t.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (t) => (t.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const privilegeTypes = useSearchAndSort(
    privilegeTypesQuery.data,
    (t) => `${t.code} ${t.name}`,
    {
      codigo: (t) => t.code,
      nombre: (t) => t.name,
      estado: (t) => (t.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (t) => (t.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  const fundTypes = useSearchAndSort(
    fundTypesQuery.data,
    (t) => `${t.code} ${t.name}`,
    {
      codigo: (t) => t.code,
      nombre: (t) => t.name,
      estado: (t) => (t.isActive ? 1 : 0),
    },
    'nombre',
    {
      estado: (t) => (t.isActive ? 'Activo' : 'Inactivo'),
    },
  );

  return (
    <div>
      <PageHeader icon={List} title="Catálogos" description="Datos de referencia compartidos por toda la plataforma." />

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <Tabs defaultValue="currencies">
          <TabsList className="w-full flex-nowrap overflow-x-auto sm:w-auto">
            <TabsTrigger value="currencies">Monedas</TabsTrigger>
            <TabsTrigger value="countries">Países</TabsTrigger>
            <TabsTrigger value="languages">Idiomas</TabsTrigger>
            <TabsTrigger value="institution-types">Tipos de institución</TabsTrigger>
            <TabsTrigger value="schedule-types">Tipos de horario</TabsTrigger>
            <TabsTrigger value="attendance-tags">Etiquetas de asistencia</TabsTrigger>
            {isChurchTenant && <TabsTrigger value="milestone-types">Tipos de hito</TabsTrigger>}
            {isChurchTenant && <TabsTrigger value="privilege-types">Privilegios</TabsTrigger>}
            {isChurchTenant && <TabsTrigger value="fund-types">Fondos</TabsTrigger>}
          </TabsList>

          {/* Monedas */}
          <TabsContent value="currencies">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TableSearch value={currencies.search} onChange={currencies.setSearch} placeholder="Buscar moneda..." />
              {isSuperadmin && (
                <Button variant="outline" onClick={() => setCreateOpen('currency')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva moneda
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={currencies.sortKey} sortDirection={currencies.sortDirection} onSort={currencies.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={currencies.sortKey} sortDirection={currencies.sortDirection} onSort={currencies.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      <SortableTableHead sortKey="simbolo" activeSortKey={currencies.sortKey} sortDirection={currencies.sortDirection} onSort={currencies.toggleSort} style={headStyle}>
                        Símbolo
                      </SortableTableHead>
                      <SortableTableHead sortKey="decimales" activeSortKey={currencies.sortKey} sortDirection={currencies.sortDirection} onSort={currencies.toggleSort} style={headStyle}>
                        Decimales
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="estado"
                        activeSortKey={currencies.sortKey}
                        sortDirection={currencies.sortDirection}
                        onSort={currencies.toggleSort}
                        style={headStyle}
                        filter={
                          <ColumnFilter
                            label="Estado"
                            options={currencies.filterOptions.estado}
                            selected={currencies.filters.estado}
                            onToggle={(v) => currencies.toggleFilterValue('estado', v)}
                            onClear={() => currencies.clearFilter('estado')}
                          />
                        }
                      >
                        Estado
                      </SortableTableHead>
                      {isSuperadmin && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currenciesQuery.isLoading && <TableSkeletonRows columns={6} />}
                    {currenciesQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <QueryErrorState message="No se pudieron cargar las monedas." onRetry={() => currenciesQuery.refetch()} />
                        </TableCell>
                      </TableRow>
                    )}
                    {!currenciesQuery.isLoading && !currenciesQuery.isError && currenciesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Todavía no hay monedas.
                        </TableCell>
                      </TableRow>
                    )}
                    {!currenciesQuery.isLoading && !currenciesQuery.isError && (currenciesQuery.data?.length ?? 0) > 0 && currencies.result.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No se encontraron resultados para tu búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                    {currencies.paginatedResult.map((currency) => (
                      <TableRow key={currency.code}>
                        <TableCell className="font-medium">{currency.code}</TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell>{currency.symbol}</TableCell>
                        <TableCell>{currency.decimalPlaces}</TableCell>
                        <TableCell>
                          {isSuperadmin ? (
                            <Switch
                              checked={currency.isActive}
                              onCheckedChange={(checked) =>
                                updateCurrencyMutation.mutate({
                                  code: currency.code,
                                  dto: { isActive: checked },
                                })
                              }
                              disabled={updateCurrencyMutation.isPending}
                              aria-label={currency.isActive ? 'Desactivar moneda' : 'Activar moneda'}
                              title={currency.isActive ? 'Desactivar' : 'Activar'}
                            />
                          ) : (
                            <StatusBadge active={currency.isActive} />
                          )}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingCurrency(currency)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={currencies.page}
                totalPages={currencies.totalPages}
                totalItems={currencies.result.length}
                pageSize={currencies.pageSize}
                onPageChange={currencies.setPage}
                onPageSizeChange={currencies.setPageSize}
              />
            </div>
          </TabsContent>

          {/* Países */}
          <TabsContent value="countries">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TableSearch value={countries.search} onChange={countries.setSearch} placeholder="Buscar país..." />
              {isSuperadmin && (
                <Button variant="outline" onClick={() => setCreateOpen('country')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo país
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={countries.sortKey} sortDirection={countries.sortDirection} onSort={countries.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={countries.sortKey} sortDirection={countries.sortDirection} onSort={countries.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      <SortableTableHead sortKey="prefijo" activeSortKey={countries.sortKey} sortDirection={countries.sortDirection} onSort={countries.toggleSort} style={headStyle}>
                        Prefijo
                      </SortableTableHead>
                      <SortableTableHead sortKey="moneda" activeSortKey={countries.sortKey} sortDirection={countries.sortDirection} onSort={countries.toggleSort} style={headStyle}>
                        Moneda por defecto
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="estado"
                        activeSortKey={countries.sortKey}
                        sortDirection={countries.sortDirection}
                        onSort={countries.toggleSort}
                        style={headStyle}
                        filter={
                          <ColumnFilter
                            label="Estado"
                            options={countries.filterOptions.estado}
                            selected={countries.filters.estado}
                            onToggle={(v) => countries.toggleFilterValue('estado', v)}
                            onClear={() => countries.clearFilter('estado')}
                          />
                        }
                      >
                        Estado
                      </SortableTableHead>
                      {isSuperadmin && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countriesQuery.isLoading && <TableSkeletonRows columns={6} />}
                    {countriesQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <QueryErrorState message="No se pudieron cargar los países." onRetry={() => countriesQuery.refetch()} />
                        </TableCell>
                      </TableRow>
                    )}
                    {!countriesQuery.isLoading && !countriesQuery.isError && countriesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Todavía no hay países.
                        </TableCell>
                      </TableRow>
                    )}
                    {!countriesQuery.isLoading && !countriesQuery.isError && (countriesQuery.data?.length ?? 0) > 0 && countries.result.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No se encontraron resultados para tu búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                    {countries.paginatedResult.map((countryItem) => (
                      <TableRow key={countryItem.code}>
                        <TableCell className="font-medium">{countryItem.code}</TableCell>
                        <TableCell>{countryItem.name}</TableCell>
                        <TableCell>{countryItem.phonePrefix ?? '—'}</TableCell>
                        <TableCell>{countryItem.defaultCurrencyCode ?? '—'}</TableCell>
                        <TableCell>
                          {isSuperadmin ? (
                            <Switch
                              checked={countryItem.isActive}
                              onCheckedChange={(checked) =>
                                updateCountryMutation.mutate({
                                  code: countryItem.code,
                                  dto: { isActive: checked },
                                })
                              }
                              disabled={updateCountryMutation.isPending}
                              aria-label={countryItem.isActive ? 'Desactivar país' : 'Activar país'}
                              title={countryItem.isActive ? 'Desactivar' : 'Activar'}
                            />
                          ) : (
                            <StatusBadge active={countryItem.isActive} />
                          )}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingCountry(countryItem)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={countries.page}
                totalPages={countries.totalPages}
                totalItems={countries.result.length}
                pageSize={countries.pageSize}
                onPageChange={countries.setPage}
                onPageSizeChange={countries.setPageSize}
              />
            </div>
          </TabsContent>

          {/* Idiomas */}
          <TabsContent value="languages">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TableSearch value={languages.search} onChange={languages.setSearch} placeholder="Buscar idioma..." />
              {isSuperadmin && (
                <Button variant="outline" onClick={() => setCreateOpen('language')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo idioma
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={languages.sortKey} sortDirection={languages.sortDirection} onSort={languages.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={languages.sortKey} sortDirection={languages.sortDirection} onSort={languages.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      {isSuperadmin && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {languagesQuery.isLoading && <TableSkeletonRows columns={3} />}
                    {languagesQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <QueryErrorState message="No se pudieron cargar los idiomas." onRetry={() => languagesQuery.refetch()} />
                        </TableCell>
                      </TableRow>
                    )}
                    {!languagesQuery.isLoading && !languagesQuery.isError && languagesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Todavía no hay idiomas.
                        </TableCell>
                      </TableRow>
                    )}
                    {!languagesQuery.isLoading && !languagesQuery.isError && (languagesQuery.data?.length ?? 0) > 0 && languages.result.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No se encontraron resultados para tu búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                    {languages.paginatedResult.map((language) => (
                      <TableRow key={language.code}>
                        <TableCell className="font-medium">{language.code}</TableCell>
                        <TableCell>{language.name}</TableCell>
                        {isSuperadmin && (
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingLanguage(language)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={languages.page}
                totalPages={languages.totalPages}
                totalItems={languages.result.length}
                pageSize={languages.pageSize}
                onPageChange={languages.setPage}
                onPageSizeChange={languages.setPageSize}
              />
            </div>
          </TabsContent>

          {/* Tipos de institución */}
          <TabsContent value="institution-types">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TableSearch value={institutionTypes.search} onChange={institutionTypes.setSearch} placeholder="Buscar tipo..." />
              {isSuperadmin && (
                <Button variant="outline" onClick={() => setCreateOpen('institution-type')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo tipo
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={institutionTypes.sortKey} sortDirection={institutionTypes.sortDirection} onSort={institutionTypes.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={institutionTypes.sortKey} sortDirection={institutionTypes.sortDirection} onSort={institutionTypes.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      <TableHead style={headStyle}>Descripción</TableHead>
                      {isSuperadmin && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutionTypesQuery.isLoading && <TableSkeletonRows columns={4} />}
                    {institutionTypesQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <QueryErrorState
                            message="No se pudieron cargar los tipos de institución."
                            onRetry={() => institutionTypesQuery.refetch()}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {!institutionTypesQuery.isLoading && !institutionTypesQuery.isError && institutionTypesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Todavía no hay tipos de institución.
                        </TableCell>
                      </TableRow>
                    )}
                    {!institutionTypesQuery.isLoading &&
                      !institutionTypesQuery.isError &&
                      (institutionTypesQuery.data?.length ?? 0) > 0 &&
                      institutionTypes.result.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No se encontraron resultados para tu búsqueda.
                          </TableCell>
                        </TableRow>
                      )}
                    {institutionTypes.paginatedResult.map((institutionType) => (
                      <TableRow key={institutionType.code}>
                        <TableCell className="font-medium">{institutionType.code}</TableCell>
                        <TableCell>{institutionType.name}</TableCell>
                        <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                          {institutionType.description ?? '—'}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingInstitutionType(institutionType)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={institutionTypes.page}
                totalPages={institutionTypes.totalPages}
                totalItems={institutionTypes.result.length}
                pageSize={institutionTypes.pageSize}
                onPageChange={institutionTypes.setPage}
                onPageSizeChange={institutionTypes.setPageSize}
              />
            </div>
          </TabsContent>

          {/* Tipos de horario */}
          <TabsContent value="schedule-types">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TableSearch value={scheduleTypes.search} onChange={scheduleTypes.setSearch} placeholder="Buscar tipo de horario..." />
              {isSuperadmin && (
                <Button variant="outline" onClick={() => setCreateOpen('schedule-type')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo tipo de horario
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={scheduleTypes.sortKey} sortDirection={scheduleTypes.sortDirection} onSort={scheduleTypes.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={scheduleTypes.sortKey} sortDirection={scheduleTypes.sortDirection} onSort={scheduleTypes.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="estado"
                        activeSortKey={scheduleTypes.sortKey}
                        sortDirection={scheduleTypes.sortDirection}
                        onSort={scheduleTypes.toggleSort}
                        style={headStyle}
                        filter={
                          <ColumnFilter
                            label="Estado"
                            options={scheduleTypes.filterOptions.estado}
                            selected={scheduleTypes.filters.estado}
                            onToggle={(v) => scheduleTypes.toggleFilterValue('estado', v)}
                            onClear={() => scheduleTypes.clearFilter('estado')}
                          />
                        }
                      >
                        Estado
                      </SortableTableHead>
                      {isSuperadmin && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleTypesQuery.isLoading && <TableSkeletonRows columns={4} />}
                    {scheduleTypesQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <QueryErrorState
                            message="No se pudieron cargar los tipos de horario."
                            onRetry={() => scheduleTypesQuery.refetch()}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {!scheduleTypesQuery.isLoading && !scheduleTypesQuery.isError && scheduleTypesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Todavía no hay tipos de horario.
                        </TableCell>
                      </TableRow>
                    )}
                    {!scheduleTypesQuery.isLoading &&
                      !scheduleTypesQuery.isError &&
                      (scheduleTypesQuery.data?.length ?? 0) > 0 &&
                      scheduleTypes.result.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No se encontraron resultados para tu búsqueda.
                          </TableCell>
                        </TableRow>
                      )}
                    {scheduleTypes.paginatedResult.map((scheduleType) => (
                      <TableRow key={scheduleType.id}>
                        <TableCell className="font-medium">{scheduleType.code}</TableCell>
                        <TableCell>{scheduleType.name}</TableCell>
                        <TableCell>
                          {isSuperadmin ? (
                            <Switch
                              checked={scheduleType.isActive}
                              onCheckedChange={(checked) =>
                                updateScheduleTypeMutation.mutate({
                                  id: scheduleType.id,
                                  dto: { isActive: checked },
                                })
                              }
                              disabled={updateScheduleTypeMutation.isPending}
                              aria-label={scheduleType.isActive ? 'Desactivar tipo de horario' : 'Activar tipo de horario'}
                              title={scheduleType.isActive ? 'Desactivar' : 'Activar'}
                            />
                          ) : (
                            <StatusBadge active={scheduleType.isActive} />
                          )}
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingScheduleType(scheduleType)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={scheduleTypes.page}
                totalPages={scheduleTypes.totalPages}
                totalItems={scheduleTypes.result.length}
                pageSize={scheduleTypes.pageSize}
                onPageChange={scheduleTypes.setPage}
                onPageSizeChange={scheduleTypes.setPageSize}
              />
            </div>
          </TabsContent>

          {/* Etiquetas de asistencia */}
          <TabsContent value="attendance-tags">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <TableSearch value={attendanceTags.search} onChange={attendanceTags.setSearch} placeholder="Buscar etiqueta..." />
                {isSuperadmin && (
                  <Select value={selectedTenantId || 'none'} onValueChange={(v) => setSelectedTenantId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Elige un tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Elige un tenant...</SelectItem>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {canManageAttendanceTags && (
                <Button variant="outline" onClick={() => setCreateOpen('attendance-tag')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva etiqueta
                </Button>
              )}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Estas etiquetas aparecen como checklist al tomar asistencia (ej. "Uniforme", "Material completo").
              {isSuperadmin && ' Cada tenant tiene las suyas — elige uno arriba para verlas o administrarlas.'}
            </p>
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-[1]">
                    <TableRow className="hover:bg-transparent">
                      <SortableTableHead sortKey="codigo" activeSortKey={attendanceTags.sortKey} sortDirection={attendanceTags.sortDirection} onSort={attendanceTags.toggleSort} style={headStyle}>
                        Código
                      </SortableTableHead>
                      <SortableTableHead sortKey="nombre" activeSortKey={attendanceTags.sortKey} sortDirection={attendanceTags.sortDirection} onSort={attendanceTags.toggleSort} style={headStyle}>
                        Nombre
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="estado"
                        activeSortKey={attendanceTags.sortKey}
                        sortDirection={attendanceTags.sortDirection}
                        onSort={attendanceTags.toggleSort}
                        style={headStyle}
                        filter={
                          <ColumnFilter
                            label="Estado"
                            options={attendanceTags.filterOptions.estado}
                            selected={attendanceTags.filters.estado}
                            onToggle={(v) => attendanceTags.toggleFilterValue('estado', v)}
                            onClear={() => attendanceTags.clearFilter('estado')}
                          />
                        }
                      >
                        Estado
                      </SortableTableHead>
                      {canManageAttendanceTags && <TableHead className="w-px" style={headStyle} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceTagsQuery.isLoading && <TableSkeletonRows columns={4} />}
                    {attendanceTagsQuery.isError && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <QueryErrorState
                            message="No se pudieron cargar las etiquetas de asistencia."
                            onRetry={() => attendanceTagsQuery.refetch()}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {!attendanceTagsQuery.isLoading && !attendanceTagsQuery.isError && isSuperadmin && !selectedTenantId && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Elige un tenant arriba para ver sus etiquetas.
                        </TableCell>
                      </TableRow>
                    )}
                    {!attendanceTagsQuery.isLoading &&
                      !attendanceTagsQuery.isError &&
                      (!isSuperadmin || !!selectedTenantId) &&
                      attendanceTagsQuery.data?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Todavía no hay etiquetas de asistencia.
                          </TableCell>
                        </TableRow>
                      )}
                    {!attendanceTagsQuery.isLoading &&
                      !attendanceTagsQuery.isError &&
                      (attendanceTagsQuery.data?.length ?? 0) > 0 &&
                      attendanceTags.result.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No se encontraron resultados para tu búsqueda.
                          </TableCell>
                        </TableRow>
                      )}
                    {attendanceTags.paginatedResult.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-medium">{tag.code}</TableCell>
                        <TableCell>{tag.name}</TableCell>
                        <TableCell>
                          {canManageAttendanceTags ? (
                            <Switch
                              checked={tag.isActive}
                              onCheckedChange={(checked) =>
                                updateAttendanceTagMutation.mutate({
                                  id: tag.id,
                                  dto: { isActive: checked },
                                })
                              }
                              disabled={updateAttendanceTagMutation.isPending}
                              aria-label={tag.isActive ? 'Desactivar etiqueta' : 'Activar etiqueta'}
                              title={tag.isActive ? 'Desactivar' : 'Activar'}
                            />
                          ) : (
                            <StatusBadge active={tag.isActive} />
                          )}
                        </TableCell>
                        {canManageAttendanceTags && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="edit"
                                size="icon"
                                onClick={() => setEditingAttendanceTag(tag)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="delete"
                                size="icon"
                                onClick={() => setDeletingAttendanceTag(tag)}
                                aria-label="Eliminar"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={attendanceTags.page}
                totalPages={attendanceTags.totalPages}
                totalItems={attendanceTags.result.length}
                pageSize={attendanceTags.pageSize}
                onPageChange={attendanceTags.setPage}
                onPageSizeChange={attendanceTags.setPageSize}
              />
            </div>
          </TabsContent>

          {isChurchTenant && (
            <TabsContent value="milestone-types">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <TableSearch value={milestoneTypes.search} onChange={milestoneTypes.setSearch} placeholder="Buscar tipo de hito..." />
                  {isSuperadmin && (
                    <Select value={selectedTenantId || 'none'} onValueChange={(v) => setSelectedTenantId(v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Elige un tenant..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Elige un tenant...</SelectItem>
                        {tenants?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {canManageAttendanceTags && (
                  <Button variant="outline" onClick={() => setCreateOpen('milestone-type')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo tipo de hito
                  </Button>
                )}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Estos tipos aparecen al registrar hitos espirituales en el detalle de una persona (ej. "Bautismo", "Membresía formal").
                {isSuperadmin && ' Cada tenant tiene los suyos — elige uno arriba para verlos o administrarlos.'}
              </p>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-[1]">
                      <TableRow className="hover:bg-transparent">
                        <SortableTableHead sortKey="codigo" activeSortKey={milestoneTypes.sortKey} sortDirection={milestoneTypes.sortDirection} onSort={milestoneTypes.toggleSort} style={headStyle}>
                          Código
                        </SortableTableHead>
                        <SortableTableHead sortKey="nombre" activeSortKey={milestoneTypes.sortKey} sortDirection={milestoneTypes.sortDirection} onSort={milestoneTypes.toggleSort} style={headStyle}>
                          Nombre
                        </SortableTableHead>
                        <SortableTableHead
                          sortKey="estado"
                          activeSortKey={milestoneTypes.sortKey}
                          sortDirection={milestoneTypes.sortDirection}
                          onSort={milestoneTypes.toggleSort}
                          style={headStyle}
                          filter={
                            <ColumnFilter
                              label="Estado"
                              options={milestoneTypes.filterOptions.estado}
                              selected={milestoneTypes.filters.estado}
                              onToggle={(v) => milestoneTypes.toggleFilterValue('estado', v)}
                              onClear={() => milestoneTypes.clearFilter('estado')}
                            />
                          }
                        >
                          Estado
                        </SortableTableHead>
                        {canManageAttendanceTags && <TableHead className="w-px" style={headStyle} />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestoneTypesQuery.isLoading && <TableSkeletonRows columns={4} />}
                      {milestoneTypesQuery.isError && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <QueryErrorState
                              message="No se pudieron cargar los tipos de hito."
                              onRetry={() => milestoneTypesQuery.refetch()}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      {!milestoneTypesQuery.isLoading && !milestoneTypesQuery.isError && isSuperadmin && !selectedTenantId && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Elige un tenant arriba para ver sus tipos de hito.
                          </TableCell>
                        </TableRow>
                      )}
                      {!milestoneTypesQuery.isLoading &&
                        !milestoneTypesQuery.isError &&
                        (!isSuperadmin || !!selectedTenantId) &&
                        milestoneTypesQuery.data?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Todavía no hay tipos de hito.
                            </TableCell>
                          </TableRow>
                        )}
                      {!milestoneTypesQuery.isLoading &&
                        !milestoneTypesQuery.isError &&
                        (milestoneTypesQuery.data?.length ?? 0) > 0 &&
                        milestoneTypes.result.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No se encontraron resultados para tu búsqueda.
                            </TableCell>
                          </TableRow>
                        )}
                      {milestoneTypes.paginatedResult.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.code}</TableCell>
                          <TableCell>{type.name}</TableCell>
                          <TableCell>
                            {canManageAttendanceTags ? (
                              <Switch
                                checked={type.isActive}
                                onCheckedChange={(checked) =>
                                  updateMilestoneTypeMutation.mutate({
                                    id: type.id,
                                    dto: { isActive: checked },
                                  })
                                }
                                disabled={updateMilestoneTypeMutation.isPending}
                                aria-label={type.isActive ? 'Desactivar tipo de hito' : 'Activar tipo de hito'}
                                title={type.isActive ? 'Desactivar' : 'Activar'}
                              />
                            ) : (
                              <StatusBadge active={type.isActive} />
                            )}
                          </TableCell>
                          {canManageAttendanceTags && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="edit"
                                  size="icon"
                                  onClick={() => setEditingMilestoneType(type)}
                                  aria-label="Editar"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="delete"
                                  size="icon"
                                  onClick={() => setDeletingMilestoneType(type)}
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={milestoneTypes.page}
                  totalPages={milestoneTypes.totalPages}
                  totalItems={milestoneTypes.result.length}
                  pageSize={milestoneTypes.pageSize}
                  onPageChange={milestoneTypes.setPage}
                  onPageSizeChange={milestoneTypes.setPageSize}
                />
              </div>
            </TabsContent>
          )}

          {isChurchTenant && (
            <TabsContent value="privilege-types">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <TableSearch value={privilegeTypes.search} onChange={privilegeTypes.setSearch} placeholder="Buscar privilegio..." />
                  {isSuperadmin && (
                    <Select value={selectedTenantId || 'none'} onValueChange={(v) => setSelectedTenantId(v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Elige un tenant..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Elige un tenant...</SelectItem>
                        {tenants?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {canManageAttendanceTags && (
                  <Button variant="outline" onClick={() => setCreateOpen('privilege-type')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo privilegio
                  </Button>
                )}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Estos privilegios se asignan a personas dentro de un culto (ej. "Alabanzas", "Dirección", "Mensaje").
                {isSuperadmin && ' Cada tenant tiene los suyos — elige uno arriba para verlos o administrarlos.'}
              </p>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-[1]">
                      <TableRow className="hover:bg-transparent">
                        <SortableTableHead sortKey="codigo" activeSortKey={privilegeTypes.sortKey} sortDirection={privilegeTypes.sortDirection} onSort={privilegeTypes.toggleSort} style={headStyle}>
                          Código
                        </SortableTableHead>
                        <SortableTableHead sortKey="nombre" activeSortKey={privilegeTypes.sortKey} sortDirection={privilegeTypes.sortDirection} onSort={privilegeTypes.toggleSort} style={headStyle}>
                          Nombre
                        </SortableTableHead>
                        <SortableTableHead
                          sortKey="estado"
                          activeSortKey={privilegeTypes.sortKey}
                          sortDirection={privilegeTypes.sortDirection}
                          onSort={privilegeTypes.toggleSort}
                          style={headStyle}
                          filter={
                            <ColumnFilter
                              label="Estado"
                              options={privilegeTypes.filterOptions.estado}
                              selected={privilegeTypes.filters.estado}
                              onToggle={(v) => privilegeTypes.toggleFilterValue('estado', v)}
                              onClear={() => privilegeTypes.clearFilter('estado')}
                            />
                          }
                        >
                          Estado
                        </SortableTableHead>
                        {canManageAttendanceTags && <TableHead className="w-px" style={headStyle} />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {privilegeTypesQuery.isLoading && <TableSkeletonRows columns={4} />}
                      {privilegeTypesQuery.isError && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <QueryErrorState
                              message="No se pudieron cargar los privilegios."
                              onRetry={() => privilegeTypesQuery.refetch()}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      {!privilegeTypesQuery.isLoading && !privilegeTypesQuery.isError && isSuperadmin && !selectedTenantId && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Elige un tenant arriba para ver sus privilegios.
                          </TableCell>
                        </TableRow>
                      )}
                      {!privilegeTypesQuery.isLoading &&
                        !privilegeTypesQuery.isError &&
                        (!isSuperadmin || !!selectedTenantId) &&
                        privilegeTypesQuery.data?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Todavía no hay privilegios.
                            </TableCell>
                          </TableRow>
                        )}
                      {!privilegeTypesQuery.isLoading &&
                        !privilegeTypesQuery.isError &&
                        (privilegeTypesQuery.data?.length ?? 0) > 0 &&
                        privilegeTypes.result.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No se encontraron resultados para tu búsqueda.
                            </TableCell>
                          </TableRow>
                        )}
                      {privilegeTypes.paginatedResult.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.code}</TableCell>
                          <TableCell>{type.name}</TableCell>
                          <TableCell>
                            {canManageAttendanceTags ? (
                              <Switch
                                checked={type.isActive}
                                onCheckedChange={(checked) =>
                                  updatePrivilegeTypeMutation.mutate({
                                    id: type.id,
                                    dto: { isActive: checked },
                                  })
                                }
                                disabled={updatePrivilegeTypeMutation.isPending}
                                aria-label={type.isActive ? 'Desactivar privilegio' : 'Activar privilegio'}
                                title={type.isActive ? 'Desactivar' : 'Activar'}
                              />
                            ) : (
                              <StatusBadge active={type.isActive} />
                            )}
                          </TableCell>
                          {canManageAttendanceTags && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="edit"
                                  size="icon"
                                  onClick={() => setEditingPrivilegeType(type)}
                                  aria-label="Editar"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="delete"
                                  size="icon"
                                  onClick={() => setDeletingPrivilegeType(type)}
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={privilegeTypes.page}
                  totalPages={privilegeTypes.totalPages}
                  totalItems={privilegeTypes.result.length}
                  pageSize={privilegeTypes.pageSize}
                  onPageChange={privilegeTypes.setPage}
                  onPageSizeChange={privilegeTypes.setPageSize}
                />
              </div>
            </TabsContent>
          )}

          {isChurchTenant && (
            <TabsContent value="fund-types">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <TableSearch value={fundTypes.search} onChange={fundTypes.setSearch} placeholder="Buscar tipo de fondo..." />
                  {isSuperadmin && (
                    <Select value={selectedTenantId || 'none'} onValueChange={(v) => setSelectedTenantId(v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Elige un tenant..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Elige un tenant...</SelectItem>
                        {tenants?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {canManageAttendanceTags && (
                  <Button variant="outline" onClick={() => setCreateOpen('fund-type')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo tipo de fondo
                  </Button>
                )}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Estos tipos aparecen al registrar fondos recogidos en un culto (ej. "Ofrenda", "Diezmo", "Talentos").
                {isSuperadmin && ' Cada tenant tiene los suyos — elige uno arriba para verlos o administrarlos.'}
              </p>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-[1]">
                      <TableRow className="hover:bg-transparent">
                        <SortableTableHead sortKey="codigo" activeSortKey={fundTypes.sortKey} sortDirection={fundTypes.sortDirection} onSort={fundTypes.toggleSort} style={headStyle}>
                          Código
                        </SortableTableHead>
                        <SortableTableHead sortKey="nombre" activeSortKey={fundTypes.sortKey} sortDirection={fundTypes.sortDirection} onSort={fundTypes.toggleSort} style={headStyle}>
                          Nombre
                        </SortableTableHead>
                        <SortableTableHead
                          sortKey="estado"
                          activeSortKey={fundTypes.sortKey}
                          sortDirection={fundTypes.sortDirection}
                          onSort={fundTypes.toggleSort}
                          style={headStyle}
                          filter={
                            <ColumnFilter
                              label="Estado"
                              options={fundTypes.filterOptions.estado}
                              selected={fundTypes.filters.estado}
                              onToggle={(v) => fundTypes.toggleFilterValue('estado', v)}
                              onClear={() => fundTypes.clearFilter('estado')}
                            />
                          }
                        >
                          Estado
                        </SortableTableHead>
                        {canManageAttendanceTags && <TableHead className="w-px" style={headStyle} />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundTypesQuery.isLoading && <TableSkeletonRows columns={4} />}
                      {fundTypesQuery.isError && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <QueryErrorState
                              message="No se pudieron cargar los tipos de fondo."
                              onRetry={() => fundTypesQuery.refetch()}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      {!fundTypesQuery.isLoading && !fundTypesQuery.isError && isSuperadmin && !selectedTenantId && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Elige un tenant arriba para ver sus tipos de fondo.
                          </TableCell>
                        </TableRow>
                      )}
                      {!fundTypesQuery.isLoading &&
                        !fundTypesQuery.isError &&
                        (!isSuperadmin || !!selectedTenantId) &&
                        fundTypesQuery.data?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Todavía no hay tipos de fondo.
                            </TableCell>
                          </TableRow>
                        )}
                      {!fundTypesQuery.isLoading &&
                        !fundTypesQuery.isError &&
                        (fundTypesQuery.data?.length ?? 0) > 0 &&
                        fundTypes.result.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No se encontraron resultados para tu búsqueda.
                            </TableCell>
                          </TableRow>
                        )}
                      {fundTypes.paginatedResult.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.code}</TableCell>
                          <TableCell>{type.name}</TableCell>
                          <TableCell>
                            {canManageAttendanceTags ? (
                              <Switch
                                checked={type.isActive}
                                onCheckedChange={(checked) =>
                                  updateFundTypeMutation.mutate({
                                    id: type.id,
                                    dto: { isActive: checked },
                                  })
                                }
                                disabled={updateFundTypeMutation.isPending}
                                aria-label={type.isActive ? 'Desactivar tipo de fondo' : 'Activar tipo de fondo'}
                                title={type.isActive ? 'Desactivar' : 'Activar'}
                              />
                            ) : (
                              <StatusBadge active={type.isActive} />
                            )}
                          </TableCell>
                          {canManageAttendanceTags && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="edit"
                                  size="icon"
                                  onClick={() => setEditingFundType(type)}
                                  aria-label="Editar"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="delete"
                                  size="icon"
                                  onClick={() => setDeletingFundType(type)}
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={fundTypes.page}
                  totalPages={fundTypes.totalPages}
                  totalItems={fundTypes.result.length}
                  pageSize={fundTypes.pageSize}
                  onPageChange={fundTypes.setPage}
                  onPageSizeChange={fundTypes.setPageSize}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      <CurrencyFormDialog open={createOpen === 'currency'} onOpenChange={(open) => !open && setCreateOpen(null)} />
      <CurrencyFormDialog
        open={!!editingCurrency}
        onOpenChange={(open) => !open && setEditingCurrency(null)}
        currency={editingCurrency ?? undefined}
      />

      <CountryFormDialog open={createOpen === 'country'} onOpenChange={(open) => !open && setCreateOpen(null)} />
      <CountryFormDialog
        open={!!editingCountry}
        onOpenChange={(open) => !open && setEditingCountry(null)}
        country={editingCountry ?? undefined}
      />

      <LanguageFormDialog open={createOpen === 'language'} onOpenChange={(open) => !open && setCreateOpen(null)} />
      <LanguageFormDialog
        open={!!editingLanguage}
        onOpenChange={(open) => !open && setEditingLanguage(null)}
        language={editingLanguage ?? undefined}
      />

      <InstitutionTypeFormDialog
        open={createOpen === 'institution-type'}
        onOpenChange={(open) => !open && setCreateOpen(null)}
      />
      <InstitutionTypeFormDialog
        open={!!editingInstitutionType}
        onOpenChange={(open) => !open && setEditingInstitutionType(null)}
        institutionType={editingInstitutionType ?? undefined}
      />

      <CatalogItemFormDialog
        open={createOpen === 'schedule-type'}
        onOpenChange={(open) => !open && setCreateOpen(null)}
        catalogCode={SCHEDULE_TYPE_CATALOG_CODE}
      />
      <CatalogItemFormDialog
        open={!!editingScheduleType}
        onOpenChange={(open) => !open && setEditingScheduleType(null)}
        catalogCode={SCHEDULE_TYPE_CATALOG_CODE}
        item={editingScheduleType ?? undefined}
      />

      <AttendanceTagFormDialog
        open={createOpen === 'attendance-tag'}
        onOpenChange={(open) => !open && setCreateOpen(null)}
        tenantId={isSuperadmin ? selectedTenantId : undefined}
      />
      <AttendanceTagFormDialog
        open={!!editingAttendanceTag}
        onOpenChange={(open) => !open && setEditingAttendanceTag(null)}
        tag={editingAttendanceTag ?? undefined}
      />

      <ConfirmDialog
        open={!!deletingAttendanceTag}
        onOpenChange={(open) => !open && setDeletingAttendanceTag(null)}
        title="Eliminar etiqueta de asistencia"
        description={
          deletingAttendanceTag
            ? `Esto elimina la etiqueta "${deletingAttendanceTag.name}". Si algún registro de asistencia ya la tenía marcada, esa marca deja de mostrarse. No se puede deshacer.`
            : ''
        }
        isPending={deleteAttendanceTagMutation.isPending}
        onConfirm={() => {
          if (!deletingAttendanceTag) return;
          deleteAttendanceTagMutation.mutate(deletingAttendanceTag.id, { onSuccess: () => setDeletingAttendanceTag(null) });
        }}
      />

      {isChurchTenant && (
        <>
          <MilestoneTypeFormDialog
            open={createOpen === 'milestone-type'}
            onOpenChange={(open) => !open && setCreateOpen(null)}
            tenantId={isSuperadmin ? selectedTenantId : undefined}
          />
          <MilestoneTypeFormDialog
            open={!!editingMilestoneType}
            onOpenChange={(open) => !open && setEditingMilestoneType(null)}
            type={editingMilestoneType ?? undefined}
          />

          <ConfirmDialog
            open={!!deletingMilestoneType}
            onOpenChange={(open) => !open && setDeletingMilestoneType(null)}
            title="Eliminar tipo de hito"
            description={
              deletingMilestoneType
                ? `Esto elimina el tipo "${deletingMilestoneType.name}". Si alguna persona ya tenía un hito de este tipo, ese registro deja de mostrarse su nombre. No se puede deshacer.`
                : ''
            }
            isPending={deleteMilestoneTypeMutation.isPending}
            onConfirm={() => {
              if (!deletingMilestoneType) return;
              deleteMilestoneTypeMutation.mutate(deletingMilestoneType.id, { onSuccess: () => setDeletingMilestoneType(null) });
            }}
          />

          <PrivilegeTypeFormDialog
            open={createOpen === 'privilege-type'}
            onOpenChange={(open) => !open && setCreateOpen(null)}
            tenantId={isSuperadmin ? selectedTenantId : undefined}
          />
          <PrivilegeTypeFormDialog
            open={!!editingPrivilegeType}
            onOpenChange={(open) => !open && setEditingPrivilegeType(null)}
            type={editingPrivilegeType ?? undefined}
          />

          <ConfirmDialog
            open={!!deletingPrivilegeType}
            onOpenChange={(open) => !open && setDeletingPrivilegeType(null)}
            title="Eliminar privilegio"
            description={
              deletingPrivilegeType
                ? `Esto elimina el privilegio "${deletingPrivilegeType.name}". Si algún evento ya lo tenía asignado, ese registro deja de mostrar su nombre. No se puede deshacer.`
                : ''
            }
            isPending={deletePrivilegeTypeMutation.isPending}
            onConfirm={() => {
              if (!deletingPrivilegeType) return;
              deletePrivilegeTypeMutation.mutate(deletingPrivilegeType.id, { onSuccess: () => setDeletingPrivilegeType(null) });
            }}
          />

          <FundTypeFormDialog
            open={createOpen === 'fund-type'}
            onOpenChange={(open) => !open && setCreateOpen(null)}
            tenantId={isSuperadmin ? selectedTenantId : undefined}
          />
          <FundTypeFormDialog
            open={!!editingFundType}
            onOpenChange={(open) => !open && setEditingFundType(null)}
            type={editingFundType ?? undefined}
          />

          <ConfirmDialog
            open={!!deletingFundType}
            onOpenChange={(open) => !open && setDeletingFundType(null)}
            title="Eliminar tipo de fondo"
            description={
              deletingFundType
                ? `Esto elimina el tipo "${deletingFundType.name}". Si algún evento ya tenía un fondo registrado con este tipo, ese registro deja de mostrar su nombre. No se puede deshacer.`
                : ''
            }
            isPending={deleteFundTypeMutation.isPending}
            onConfirm={() => {
              if (!deletingFundType) return;
              deleteFundTypeMutation.mutate(deletingFundType.id, { onSuccess: () => setDeletingFundType(null) });
            }}
          />
        </>
      )}
    </div>
  );
}
