/**
 * @isai/shared-types
 *
 * Fuente de verdad única para tipos compartidos entre API (backend) y Web (frontend).
 *
 * Regla: Si defines un tipo en el frontend sin haberlo tomado de aquí, es un bug de proceso.
 * Todo tipo que cruce el límite API ↔ Web debe vivir aquí.
 *
 * Alineado contra el schema real de isai_desa (no contra el diseño de texto original).
 */

// ─── General ────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  currencyCode: string;
  countryCode: string;
  languageCode: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Institution {
  id: string;
  tenantId: string;
  typeCode: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Branch {
  id: string;
  institutionId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

/** Forma que devuelve GET /branches (todas las del tenant, con su institución) */
export interface BranchWithInstitution extends Branch {
  institution: { id: string; name: string };
}

export interface InstitutionType {
  code: string;
  name: string;
  description?: string | null;
}

/** Catálogo genérico discriminado por catalogCode (ej: "schedule_type") */
export interface CatalogItem {
  id: string;
  catalogCode: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

/** Etiqueta de asistencia propia del tenant activo (ej. "Uniforme") — a diferencia de CatalogItem, no es global. */
export interface AttendanceTag {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  institutionId?: string | null;
  branchId?: string | null;
  countryCode: string;
  stateProvince?: string | null;
  city: string;
  line1: string;
  line2?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
}

/** startTime/endTime llegan como ISO datetime (la parte de hora es la única válida, ej "1970-01-01T10:00:00.000Z") */
export interface BranchSchedule {
  id: string;
  branchId: string;
  scheduleTypeId: string;
  dayOfWeek: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime?: string | null;
  label?: string | null;
  isActive: boolean;
  /** Grupo al que aplica este horario (ej. "Culto de Jóvenes" -> grupo "Jóvenes") — vacío = toda la sucursal */
  groupId?: string | null;
  scheduleType: CatalogItem;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
}

export interface Country {
  code: string;
  name: string;
  phonePrefix?: string | null;
  defaultCurrencyCode?: string | null;
  isActive: boolean;
}

export interface Language {
  code: string;
  name: string;
}

/** Forma que devuelve GET /institutions (incluye conteo de sucursales) */
export interface InstitutionListItem extends Institution {
  branchCount: number;
}

/** Forma que devuelve GET /institutions/:id */
export interface InstitutionWithBranches extends Institution {
  branches: Branch[];
}

export interface Module {
  code: string;
  name: string;
  description?: string | null;
  isCore: boolean;
  colorHex: string;
}

// ─── Menús ───────────────────────────────────────────────────────────────────

export interface MenuNode {
  id: string;
  code: string;
  label: string;
  icon: string | null;
  route: string | null;
  level: number;
  sortOrder: number;
  module: { code: string; colorHex: string };
  children: MenuNode[];
}

// ─── Membresía ─────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  personTypeId: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  identityDocument?: string | null;
  photoUrl?: string | null;
  addressLine?: string | null;
  city?: string | null;
  joinDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Forma que devuelven GET /persons y GET /persons/:id */
export interface PersonWithRelations extends Person {
  personType: CatalogItem;
  branch?: { id: string; name: string } | null;
}

/** Forma que devuelve GET /persons/:id/groups — grupos de los que es miembro actual */
export interface PersonGroupMembership {
  id: string;
  groupId: string;
  personId: string;
  role: string;
  joinedAt: string;
  leftAt?: string | null;
  group: { id: string; name: string; groupType: { name: string } };
}

/** Forma que devuelve GET /persons/:id/positions — cargos de directiva, vigentes y pasados */
export interface PersonPosition {
  id: string;
  groupId: string;
  personId: string;
  positionId: string;
  termStart: string;
  termEnd?: string | null;
  group: { id: string; name: string };
  position: { id: string; name: string };
}

/**
 * Forma que devuelve GET /persons/:id/relationships — ya normalizada a la
 * perspectiva de la persona consultada (el backend voltea el tipo de
 * relación si la fila real se guardó desde el otro lado, ver
 * PersonsService.findRelationships).
 */
export interface PersonRelationshipItem {
  id: string;
  relatedPerson: { id: string; firstName: string; lastName: string };
  relationshipType: { code: string; name: string };
  notes?: string | null;
  createdAt: string;
}

/** Forma que devuelve GET /milestone-types — tipos de hito propios del tenant activo (solo iglesias) */
export interface MilestoneType {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** Forma que devuelve GET /persons/:id/milestones */
export interface PersonMilestone {
  id: string;
  personId: string;
  milestoneTypeId: string;
  occurredOn: string;
  notes?: string | null;
  createdAt: string;
  milestoneType: { id: string; code: string; name: string };
}

/** Forma que devuelve GET /privilege-types — tipos de privilegio de culto propios del tenant activo (solo iglesias) */
export interface PrivilegeType {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** Forma que devuelve GET /events/:id/privileges */
export interface EventPrivilege {
  id: string;
  eventId: string;
  personId: string;
  privilegeTypeId: string;
  notes?: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastName: string };
  privilegeType: { id: string; code: string; name: string };
}

/** Forma que devuelve GET /fund-types — tipos de fondo propios del tenant activo (solo iglesias) */
export interface FundType {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** Forma que devuelve GET /events/:id/fund-collections — `amount` viaja como string (Prisma Decimal serializado) */
export interface EventFundCollection {
  id: string;
  eventId: string;
  fundTypeId: string;
  amount: string;
  notes?: string | null;
  createdAt: string;
  /** null = pendiente de contabilizar. Con valor = ya tiene asiento en finanzas.journal_entries. */
  journalEntryId?: string | null;
  fundType: { id: string; code: string; name: string };
}

/** Forma que devuelve GET /accounts — catálogo de cuentas del tenant, con saldo (string, Decimal serializado) */
export interface Account {
  id: string;
  tenantId: string;
  parentAccountId?: string | null;
  accountTypeId: string;
  code: string;
  name: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  allowsTransactions: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accountType: { code: string; name: string };
  balance: string;
}

/** Forma que devuelve GET /journal-entries y GET /journal-entries/:id */
export interface JournalEntry {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  entryDate: string;
  description?: string | null;
  status: 'draft' | 'posted' | 'void';
  sourceType?: string | null;
  sourceId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string } | null;
  lines: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  groupId?: string | null;
  debitAmount: string;
  creditAmount: string;
  description?: string | null;
  createdAt: string;
  account: { id: string; code: string; name: string };
}

/** Forma que devuelve GET /reports/fund-summary — totales por sucursal/grupo/cuenta (solo asientos posted) */
export interface FundSummaryRow {
  branch: string;
  group: string;
  account: string;
  totalDebit: string;
  totalCredit: string;
}

/** Forma que devuelve GET /reports/dashboard-kpis */
export interface DashboardKpis {
  incomeThisMonth: string;
  expenseThisMonth: string;
  cashBalance: string;
  pendingCount: number;
}

/** Forma que devuelve GET /reports/monthly-trend — una fila por mes+tipo de fondo */
export interface MonthlyTrendRow {
  month: string; // 'YYYY-MM'
  fundCode: string; // 'OFRENDA' | 'DIEZMO' | 'TALENTO' | ...
  total: string;
}

/** Forma que devuelven GET /projects, GET /projects/:id, POST /projects, PATCH /projects/:id */
export interface Project {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId: string;
  name: string;
  description?: string | null;
  goalAmount: string;
  targetDate?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  incomeAccountId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
  incomeAccount?: { id: string; code: string; name: string } | null;
  /** Suma de TODOS los aportes (contabilizados o no) — el KPI de avance no espera a "Contabilizar". */
  totalContributed: string;
  /** Suma de TODOS los gastos (contabilizados o no) — mismo criterio que totalContributed. */
  totalSpent: string;
}

/** Forma que devuelve GET /projects/:id/contributions */
export interface ProjectContribution {
  id: string;
  projectId: string;
  personId?: string | null;
  groupId?: string | null;
  amount: string;
  contributedAt: string;
  notes?: string | null;
  journalEntryId?: string | null;
  createdAt: string;
  person?: { id: string; firstName: string; lastName: string } | null;
  group?: { id: string; name: string } | null;
}

/** Forma que devuelve GET /projects/:id/expenses */
export interface ProjectExpense {
  id: string;
  projectId: string;
  accountId: string;
  amount: string;
  incurredAt: string;
  notes?: string | null;
  journalEntryId?: string | null;
  createdAt: string;
  account: { id: string; code: string; name: string };
}

/** Forma que devuelve GET /groups/:id/fund-balance */
export interface GroupFundBalance {
  balance: string;
}

/** Forma que devuelve GET /groups/fund-summary?institutionId=... */
export interface GroupFundSummary extends GroupListItem {
  balance: string;
}

/** Forma que devuelve GET /groups/:id/fund-movements */
export interface GroupFundMovement {
  id: string;
  journalEntryId: string;
  type: 'income' | 'expense';
  account: { id: string; code: string; name: string };
  amount: string;
  entryDate: string;
  notes?: string | null;
}

export interface Group {
  id: string;
  institutionId: string;
  branchId?: string | null;
  groupTypeId: string;
  parentGroupId?: string | null;
  name: string;
  description?: string | null;
  leaderPersonId?: string | null;
  /** Cuenta de Activo donde vive el fondo propio del grupo — null = fondo sin configurar, bloquea registrar movimientos. */
  cashAccountId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Forma que devuelven GET /groups/:id, POST /groups, PATCH /groups/:id */
export interface GroupWithRelations extends Group {
  groupType: CatalogItem;
  branch?: { id: string; name: string } | null;
  leader?: { id: string; firstName: string; lastName: string } | null;
  cashAccount?: { id: string; code: string; name: string } | null;
}

/** Forma que devuelve GET /groups (incluye conteo de miembros actuales) */
export interface GroupListItem extends GroupWithRelations {
  _count: { members: number };
}

/** Pertenencia a un grupo CON historial — leftAt null = miembro actual */
export interface GroupMember {
  id: string;
  groupId: string;
  personId: string;
  role?: string | null;
  joinedAt: string;
  leftAt?: string | null;
  createdAt: string;
}

/** Forma que devuelven GET /groups/:id/members y POST .../members */
export interface GroupMemberWithPerson extends GroupMember {
  person: { id: string; firstName: string; lastName: string };
}

/** Cargo de directiva CON vigencia — termEnd null = cargo vigente */
export interface GroupPosition {
  id: string;
  groupId: string;
  personId: string;
  positionId: string;
  termStart: string;
  termEnd?: string | null;
  createdAt: string;
}

/** Forma que devuelven GET/POST/PATCH /group-positions */
export interface GroupPositionWithRelations extends GroupPosition {
  group: { id: string; name: string; institutionId: string; branchId?: string | null };
  person: { id: string; firstName: string; lastName: string };
  position: { id: string; code: string; name: string };
}

/** Ocurrencia concreta (no un horario recurrente, eso es BranchSchedule) */
export interface Event {
  id: string;
  institutionId: string;
  branchId?: string | null;
  groupId?: string | null;
  scheduleId?: string | null;
  eventTypeId: string;
  title: string;
  eventDate: string;
  /** Hora, viaja como datetime ISO con fecha de referencia 1970-01-01 */
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Forma que devuelven GET/POST/PATCH /events */
export interface EventWithRelations extends Event {
  eventType: CatalogItem;
  branch?: { id: string; name: string } | null;
  group?: { id: string; name: string } | null;
  /** Cuántas personas ya tienen un registro de asistencia para este evento */
  _count: { attendances: number };
}

/** Registro de asistencia de una persona a un evento */
export interface EventAttendance {
  id: string;
  eventId: string;
  personId: string;
  statusId: string;
  notes?: string | null;
  extraData?: { tags?: string[] } | null;
  recordedBy?: string | null;
  createdAt: string;
}

export interface EventAttendanceWithStatus extends EventAttendance {
  status: { id: string; code: string; name: string };
}

/** Fila del roster de GET /events/:id/roster — attendance null = todavía sin registrar */
export interface EventRosterEntry {
  person: { id: string; firstName: string; lastName: string };
  attendance: EventAttendanceWithStatus | null;
}

/** Fila de seguridad.audit_logs — una mutación (POST/PUT/PATCH/DELETE) registrada automáticamente */
export interface AuditLog {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  /** Estado resultante (body de la respuesta), no el estado anterior — ver AuditLogInterceptor */
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

/** Forma que devuelve GET /audit-logs */
export interface AuditLogPage {
  data: AuditLog[];
  total: number;
}

/** Fila de la previsualización de carga masiva (POST /persons/import/preview) */
export interface ImportPreviewRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  status: 'ok' | 'duplicate' | 'invalid';
  reason?: string;
  duplicateOf?: { id: string; name: string };
}

// ─── Security ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string | null; // null = superadmin de la plataforma
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  locale: string;
  timezone: string;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Solo viene poblado en endpoints que lo incluyen explícitamente (ej. /auth/me) —
  // no todos los que devuelven User traen roles asignados en ese momento (ej. recién creado).
  roles?: string[];
  /** Permisos efectivos (códigos planos, ej. "finance.group_fund.view") — solo en /auth/me. */
  permissions?: string[];
}

/** Forma que devuelve GET /users (subset de campos + nombres de rol) */
export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: string[];
}

export interface Role {
  id: string;
  tenantId: string | null; // null = rol de sistema (superadmin, admin)
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Permission {
  id: string;
  moduleCode: string;
  resource: string;
  actionCode: string;
  /** Formato: modulo.recurso.accion (ej: finance.invoice.create) — columna generada */
  code: string;
  name: string;
  description?: string | null;
}

/** Forma que devuelve GET /permissions (catálogo, con el módulo dueño) */
export interface PermissionWithModule extends Permission {
  module: { code: string; name: string; colorHex: string };
}

/** Forma que devuelven GET /roles y GET /roles/:id */
export interface RoleWithPermissions extends Role {
  rolePermissions: { permission: Permission }[];
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null; // null = superadmin de la plataforma
  permissions: string[];
  isSuperadmin: boolean;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Respuesta de error estándar de la API */
export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

/** Lista paginada estándar */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
