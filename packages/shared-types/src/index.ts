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
  /** Permite identificar donantes por nombre en las colectas de este tipo (§8.1). */
  tracksDonors: boolean;
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
  fundType: { id: string; code: string; name: string; tracksDonors: boolean };
}

/** Forma que devuelve GET /events/:id/fund-collections/:collectionId/donors */
export interface EventFundCollectionDonor {
  id: string;
  collectionId: string;
  personId: string;
  amount: string;
  paymentMethod?: 'cash' | 'transfer' | 'check' | null;
  notes?: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastName: string };
}

export interface DonorStatementLine {
  date: string;
  source: 'event_fund_collection' | 'project_contribution';
  description: string;
  amount: string;
}

/** Forma que devuelve GET /reports/donor-statement — receipt viene poblado
 * solo si ya se "Registró" el comprobante (ver POST /reports/donor-statement/receipts). */
export interface DonorStatement {
  person: { id: string; firstName: string; lastName: string };
  year: number;
  totalDonated: string;
  lines: DonorStatementLine[];
  receipt?: { documentNumber: string; generatedAt: string };
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
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  reversesEntryId?: string | null;
  reversedByEntryId?: string | null;
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
  project: string;
  account: string;
  totalDebit: string;
  totalCredit: string;
}

/** Nodo del árbol de cuentas con saldo — usado por income-statement y balance-sheet */
export interface AccountBalanceNode {
  id: string;
  code: string;
  name: string;
  parentAccountId: string | null;
  ownAmount: string;
  total: string;
  isComputed?: boolean;
  children: AccountBalanceNode[];
}

/** Forma que devuelve GET /reports/income-statement */
export interface IncomeStatement {
  startDate: string;
  endDate: string;
  income: AccountBalanceNode[];
  expense: AccountBalanceNode[];
  totalIncome: string;
  totalExpense: string;
  netResult: string;
}

/** Forma que devuelve GET /reports/balance-sheet */
export interface BalanceSheet {
  asOfDate: string;
  assets: AccountBalanceNode[];
  liabilities: AccountBalanceNode[];
  equity: AccountBalanceNode[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
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
  /** Suma de TODOS los compromisos/promesas activos — nunca se contabilizan, ver ProjectPledge. */
  totalPledged: string;
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
  /** Comprobante OPCIONAL por transacción — null hasta que alguien lo genera (POST .../receipt). */
  documentNumber?: string | null;
}

/** Forma que devuelve GET /projects/:id/pledges — promesa de aporte, nunca
 * genera asiento contable (sin journalEntryId, a diferencia de ProjectContribution). */
export interface ProjectPledge {
  id: string;
  projectId: string;
  personId?: string | null;
  groupId?: string | null;
  amount: string;
  frequency: 'once' | 'monthly' | 'weekly';
  installmentsTotal?: number | null;
  status: 'active' | 'fulfilled' | 'cancelled';
  expectedDate?: string | null;
  notes?: string | null;
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
  /** Correlativo legible por sucursal, reinicia cada año (ej. "GTO-2026-000042"). */
  documentNumber?: string | null;
  /** Resumen sincronizado desde ExpenseApprovalRequest — el detalle de cada paso vive ahí, no acá. */
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  /** true si el usuario actual es la persona asignada al paso accionable ahora mismo (y no quien registró el gasto). */
  canCurrentUserApprove?: boolean;
  /** Persona que debe decidir el paso accionable ahora — para mostrar "Esperando aprobación de: X" en vez de un badge genérico. */
  activeStepApprover?: { id: string; firstName: string; lastName: string } | null;
}

/** Paso de una ApprovalRoute — plantilla, se clona al crear la solicitud real de un gasto. Por persona puntual, no por rol. */
export interface ApprovalRouteStep {
  id: string;
  stepOrder: number;
  approverUserId: string;
  approverUser: { id: string; firstName: string; lastName: string; email: string };
}

/** Ruta de aprobación de gastos (Fase 2 §7.3, multi-paso) */
export interface ApprovalRoute {
  id: string;
  tenantId: string;
  institutionId?: string | null;
  branchId?: string | null;
  name: string;
  minAmount: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  institution?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  steps: ApprovalRouteStep[];
  /** Cuentas a las que aplica — vacío = aplica a cualquier cuenta. */
  accounts: { id: string; accountId: string; account: { id: string; code: string; name: string } }[];
}

/** Forma que devuelven GET /expense-approvals/mine y GET /expense-approvals
 * — un gasto pendiente (de Proyecto o de Fondo de Grupo) ya resuelto, sin
 * que el frontend tenga que cruzar nada. `project`/`group` son el
 * discriminador: exactamente uno viene poblado, según sourceType. */
export interface PendingApprovalRow {
  requestId: string;
  sourceType: 'project_expense' | 'group_fund_expense';
  sourceId: string;
  routeName: string;
  amount: string;
  documentNumber: string | null;
  account: { id: string; code: string; name: string };
  createdAt: string;
  createdByUser: { id: string; firstName: string; lastName: string } | null;
  /** Persona asignada al paso accionable ahora — siempre el usuario actual en "mine". */
  activeStepApprover: { id: string; firstName: string; lastName: string } | null;
  stepOrder: number;
  totalSteps: number;
  project?: { id: string; name: string };
  group?: { id: string; name: string };
}

/** Presupuesto (Fase 2 §7.1) — branchId null = toda la institución */
export interface Budget {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'active' | 'closed';
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string } | null;
  lines: BudgetLine[];
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  accountId: string;
  monthlyAmount: string;
  notes?: string | null;
  account: { id: string; code: string; name: string };
}

/** Catálogo plano de categorías de producto (docs/comercio-mejoras-propuestas.md §2). */
export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** Producto del catálogo de Inventario (docs/comercio-mejoras-propuestas.md §2). */
export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string | null;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  unitCode: string;
  /** null = este producto nunca se vende, solo uso interno. */
  salePrice?: string | null;
  averageCost: string;
  tracksInventory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  /** Presentaciones adicionales de compra/venta (ej. Caja, Fardo) — ver ProductUnit. */
  units: ProductUnit[];
}

/** Presentación adicional de compra/venta de un producto (docs/comercio-mejoras-propuestas.md §2). */
export interface ProductUnit {
  id: string;
  productId: string;
  unitCode: string;
  /** Cuántas unitCode base (Product.unitCode) trae 1 de esta presentación. */
  conversionToBase: string;
  /** null = esta presentación no se vende entera, solo se compra. */
  salePrice?: string | null;
  createdAt: string;
}

/** Existencia de un producto en una sucursal (docs/comercio-mejoras-propuestas.md §3). */
export interface ProductStock {
  id: string;
  productId: string;
  branchId: string;
  quantity: string;
  updatedAt: string;
  branch: { id: string; name: string };
}

/** Movimiento de existencia (docs/comercio-mejoras-propuestas.md §3) — historial inmutable. */
export interface InventoryMovement {
  id: string;
  productId: string;
  branchId: string;
  movementType: 'adjustment' | 'internal_use' | 'purchase' | 'sale';
  quantity: string;
  unitCost?: string | null;
  sourceType: string;
  sourceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  branch: { id: string; name: string };
}

/** Registro de custodia (docs/comercio-mejoras-propuestas.md §6). */
export interface Asset {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  name: string;
  categoryCode?: string | null;
  quantity: number;
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: string | null;
  condition: 'good' | 'fair' | 'damaged' | 'out_of_service';
  location?: string | null;
  custodianPersonId?: string | null;
  /** De qué gasto salió — opcional, solo referencia, nunca toca la contabilidad. */
  sourceType?: 'project_expense' | 'group_fund_expense' | null;
  sourceId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string } | null;
  custodianPerson?: { id: string; firstName: string; lastName: string } | null;
  /** Resuelto en el backend a partir de sourceType/sourceId, si están presentes. */
  sourceSummary?: { description: string; amount: string; date: string } | null;
}

/** Historial de custodia/ubicación/condición de un Asset — bitácora inmutable. */
export interface AssetMovement {
  id: string;
  assetId: string;
  movementType: 'assigned' | 'returned' | 'relocated' | 'condition_change' | 'disposed';
  fromCustodianPersonId?: string | null;
  toCustodianPersonId?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

/** Proveedor (docs/comercio-mejoras-propuestas.md §4) — tenant-wide, sin vínculo a producto. */
export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Línea de una compra — producto + cantidad + costo unitario (docs/comercio-mejoras-propuestas.md §4). */
export interface PurchaseLine {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: string;
  unitCost: string;
  product: { id: string; name: string; sku?: string | null };
}

/** Compra a un proveedor (docs/comercio-mejoras-propuestas.md §4) — registrar→Contabilizar en 2 pasos. */
export interface Purchase {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId: string;
  supplierId: string;
  purchaseDate: string;
  supplierDocumentNumber?: string | null;
  paymentMethod?: 'cash' | 'transfer' | 'credit' | null;
  notes?: string | null;
  /** null hasta "Contabilizar" — mueve existencia y genera el asiento contable. */
  journalEntryId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  branch: { id: string; name: string };
  supplier: { id: string; name: string };
  lines: PurchaseLine[];
}

/** Cliente (docs/comercio-mejoras-propuestas.md §5) — tenant-wide, sin vínculo a membresia.Person. */
export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Línea de una venta — producto + cantidad + precio (docs/comercio-mejoras-propuestas.md §5). */
export interface SaleLine {
  id: string;
  saleId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  /** Copiado de Product.averageCost al momento de la venta. */
  unitCost: string;
  product: { id: string; name: string; sku?: string | null };
}

/** Venta a un cliente (docs/comercio-mejoras-propuestas.md §5) — atómica, inmutable una vez creada. */
export interface Sale {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId: string;
  /** null = Consumidor Final. */
  customerId?: string | null;
  saleDate: string;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'credit';
  documentType: 'invoice' | 'receipt';
  documentNumber: string;
  notes?: string | null;
  journalEntryId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  branch: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  lines: SaleLine[];
}

/** Margen por producto en un rango de fechas (docs/comercio-mejoras-propuestas.md §Fase 2). */
export interface ProductMarginRow {
  productId: string;
  sku?: string | null;
  name: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  margin: string;
  marginPercent: string;
}

/** Valorización de inventario actual — cantidad × costo promedio, por producto. */
export interface InventoryValuationRow {
  productId: string;
  sku?: string | null;
  name: string;
  unitCode: string;
  quantity: string;
  averageCost: string;
  value: string;
}

/** Cierre de periodo formal (docs/finanzas-mejoras-propuestas.md §9.1). */
export interface PeriodClosing {
  id: string;
  tenantId: string;
  institutionId: string;
  branchId?: string | null;
  closedThroughDate: string;
  closingEntryId?: string | null;
  targetEquityAccountId: string;
  notes?: string | null;
  closedBy: string;
  closedAt: string;
  reopenedAt?: string | null;
  reopenedBy?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  branch?: { id: string; name: string } | null;
  targetEquityAccount: { id: string; code: string; name: string };
  closedByUser: { id: string; firstName: string; lastName: string };
  reopenedByUser?: { id: string; firstName: string; lastName: string } | null;
}

/** Fila de GET /reports/budget-vs-actual */
export interface BudgetVsActualRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  budgeted: string;
  actual: string;
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
/** Forma que devuelve GET /groups/:id/fund-movements — ingresos (siempre
 * posted) y gastos (cualquier estado) combinados en un solo feed. */
export interface GroupFundMovement {
  id: string;
  journalEntryId: string | null;
  type: 'income' | 'expense';
  account: { id: string; code: string; name: string };
  amount: string;
  entryDate: string;
  notes?: string | null;
  /** Correlativo legible (ej. "GFO-2026-000007") — null en filas de ingreso. */
  documentNumber?: string | null;
  /** null en filas de ingreso (nunca llevan aprobación). */
  approvalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected' | null;
  canCurrentUserApprove?: boolean;
  activeStepApprover?: { id: string; firstName: string; lastName: string } | null;
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
  /** true = roster son solo personas activas sin ningún grupo actual — mutuamente excluyente con groupId */
  ungroupedOnly: boolean;
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

/** Forma que devuelve GET /reports/attendance-trend?institutionId=... — un punto por evento */
export interface AttendanceTrendPoint {
  eventId: string;
  eventDate: string;
  title: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

/** Forma que devuelve GET /reports/attendance-by-branch?institutionId=... */
export interface AttendanceByBranchRow {
  branchId: string | null;
  branchName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

/** Forma que devuelve GET /reports/attendance-absences?institutionId=...&limit=... */
export interface AttendanceAbsenceRow {
  personId: string;
  firstName: string;
  lastName: string;
  /** Cuántas veces faltó dentro de los últimos `considered` cultos de su sucursal */
  absences: number;
  considered: number;
}

/** Forma que devuelve GET /reports/schedules?institutionId=... — para filtrar los reportes de asistencia */
export interface ReportScheduleOption {
  id: string;
  label: string;
  branchId: string;
  branchName: string;
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
  mustChangePassword: boolean;
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
  mustChangePassword: boolean;
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
