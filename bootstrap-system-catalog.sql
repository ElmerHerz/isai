-- ============================================================
-- Bootstrap del catálogo global del sistema (permisos, menús,
-- tipos de documento, acciones) — datos tenant-independientes.
--
-- Consolida en UN SOLO script, en orden, todos los `add-*.sql` sueltos que
-- se habían ido acumulando en la raíz del repo (cada uno nacido para una
-- rebanada de trabajo puntual) más un script que se encontró corriendo
-- directo en el droplet sin haber quedado guardado en el repo
-- (add-membresia-reports-menu.sql). A partir de ahora, este es el único
-- script que hace falta correr para que el catálogo global quede
-- completo — ya no hace falta ir uno por uno.
--
-- Por qué es seguro correrlo en CUALQUIER momento, incluso ya con tenants
-- reales cargados: todo es `ON CONFLICT DO NOTHING` y nada de esto tiene
-- tenant_id (seguridad.permissions, seguridad.actions, general.menus,
-- general.modules, general.document_types son catálogo global, igual
-- para todos los tenants) — no toca ni borra ninguna fila de negocio de
-- ningún tenant. La única excepción (DELETE puntual de dos permisos ya
-- deprecados, ver sección de Aprobación de Gastos) también es
-- tenant-independiente e idempotente.
--
-- Cuándo correrlo: en dev local, en un droplet recién levantado (después
-- de restaurar el esquema base), o después de vaciar tenants de un
-- droplet existente (ver docs/deploy-digitalocean-pruebas.md) — en los
-- tres casos deja el catálogo global al día.
--
-- Los IDs de rol ('39dddea5-...' = Administrador, rol de SISTEMA global
-- sin tenant_id, disponible en cualquier tenant; 'e0464193-...' = Demo,
-- rol de prueba del tenant "Tenant Demo") se dejan tal cual estaban en
-- cada script original — si el tenant Demo no existe (p.ej. se vació),
-- esos INSERT simplemente no encuentran filas y no hacen nada; no fallan.
-- ============================================================

BEGIN;

-- ─── Inventario, Rebanada 1 (catálogo de productos) ──────────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'inventory', 'product', 'view',   'Ver catálogo de productos'),
  (gen_random_uuid(), 'inventory', 'product', 'create', 'Crear productos'),
  (gen_random_uuid(), 'inventory', 'product', 'update', 'Editar productos')
ON CONFLICT (code) DO NOTHING;

-- Encabezado de nivel raíz del sidebar (sort_order en decenas: 10/20/30/40,
-- Inventario es su propio módulo raíz, no cuelga de Finanzas).
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  NULL, 'inventory', NULL, 'Inventario', 'package', NULL, 50, 'INVENTORY', 1
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 'inventory',
  'inventory.product.view', 'Productos', 'package', '/inventory/products', 1, 'INV_PRODUCTS', 2
)
ON CONFLICT (code) DO NOTHING;

-- ─── Inventario, Rebanada 3 (Activos) ─────────────────────────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'inventory', 'asset', 'view',   'Ver activos'),
  (gen_random_uuid(), 'inventory', 'asset', 'create', 'Crear activos'),
  (gen_random_uuid(), 'inventory', 'asset', 'update', 'Editar activos (custodia, ubicación, condición, dar de baja)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '50000000-0000-0000-0000-000000000001', 'inventory',
  'inventory.asset.view', 'Activos', 'warehouse', '/inventory/assets', 2, 'INV_ASSETS', 2
)
ON CONFLICT (code) DO NOTHING;

-- ─── Comercio, Rebanada 1 (Proveedores + Compras) ─────────────────────────

INSERT INTO general.modules (code, name, is_core, color_hex)
VALUES ('store', 'Comercio', false, '#84cc16')
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'store', 'supplier', 'view',   'Ver proveedores'),
  (gen_random_uuid(), 'store', 'supplier', 'create', 'Crear proveedores'),
  (gen_random_uuid(), 'store', 'supplier', 'update', 'Editar proveedores'),
  (gen_random_uuid(), 'store', 'purchase', 'view',   'Ver compras'),
  (gen_random_uuid(), 'store', 'purchase', 'create', 'Registrar compras y sus líneas'),
  (gen_random_uuid(), 'store', 'purchase', 'update', 'Contabilizar compras')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  NULL, 'store', NULL, 'Comercio', 'shopping-cart', NULL, 60, 'STORE', 1
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'store',
  'store.supplier.view', 'Proveedores', 'truck', '/store/suppliers', 1, 'STORE_SUPPLIERS', 2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'store',
  'store.purchase.view', 'Compras', 'receipt', '/store/purchases', 2, 'STORE_PURCHASES', 2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.module_code = 'store'
ON CONFLICT DO NOTHING;

-- ─── Comercio, Rebanada 2 (Clientes + Ventas) ─────────────────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'store', 'customer', 'view',   'Ver clientes'),
  (gen_random_uuid(), 'store', 'customer', 'create', 'Crear clientes'),
  (gen_random_uuid(), 'store', 'customer', 'update', 'Editar clientes'),
  (gen_random_uuid(), 'store', 'sale',     'view',   'Ver ventas'),
  (gen_random_uuid(), 'store', 'sale',     'create', 'Registrar ventas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'store',
  'store.customer.view', 'Clientes', 'users', '/store/customers', 3, 'STORE_CUSTOMERS', 2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'store',
  'store.sale.view', 'Ventas', 'credit-card', '/store/sales', 4, 'STORE_SALES', 2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.module_code = 'store'
  AND p.resource IN ('customer', 'sale')
ON CONFLICT DO NOTHING;

-- ─── Comercio, Rebanada final (Reportería) ────────────────────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES (gen_random_uuid(), 'store', 'report', 'view', 'Ver reportes de tienda')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '70000000-0000-0000-0000-000000000001', 'store',
  'store.report.view', 'Reportes', 'bar-chart', '/store/reports', 5, 'STORE_REPORTS', 2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code = 'store.report.view'
ON CONFLICT DO NOTHING;

-- ─── Finanzas: Presupuestos ────────────────────────────────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'budget', 'view',   'Ver presupuestos'),
  (gen_random_uuid(), 'finance', 'budget', 'create', 'Crear presupuestos'),
  (gen_random_uuid(), 'finance', 'budget', 'update', 'Editar presupuestos (incluye líneas)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '40000000-0000-0000-0000-000000000001', 'finance',
  'finance.budget.view', 'Presupuestos', 'piggy-bank', '/finance/budgets', 5, 'FIN_BUDGETS', 2
)
ON CONFLICT (code) DO NOTHING;

-- ─── Finanzas: Cierre de periodo ───────────────────────────────────────

-- 'reopen' no existía como action_code global — se agrega (mismo criterio
-- que 'approve'/'revoke', un verbo reusable por cualquier módulo futuro).
INSERT INTO seguridad.actions (code, name)
VALUES ('reopen', 'Reabrir')
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'period_closing', 'view',   'Ver cierres de periodo'),
  (gen_random_uuid(), 'finance', 'period_closing', 'create', 'Cerrar un periodo contable'),
  (gen_random_uuid(), 'finance', 'period_closing', 'reopen', 'Reabrir un periodo cerrado (solo superadmin)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '40000000-0000-0000-0000-000000000001', 'finance',
  'finance.period_closing.view', 'Cierre de periodo', 'lock', '/finance/period-closings', 6, 'FIN_PERIOD_CLOSINGS', 2
)
ON CONFLICT (code) DO NOTHING;

-- ─── Finanzas: Aprobación de gastos (ruta multi-paso) ──────────────────

-- Reemplaza los permisos de umbral plano de un diseño anterior que nadie
-- llegó a asignar a ningún rol.
DELETE FROM seguridad.permissions WHERE code LIKE 'finance.approval_threshold.%';

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'approval_route', 'view',   'Ver rutas de aprobación de gastos'),
  (gen_random_uuid(), 'finance', 'approval_route', 'create', 'Crear rutas de aprobación de gastos'),
  (gen_random_uuid(), 'finance', 'approval_route', 'update', 'Editar rutas de aprobación de gastos')
ON CONFLICT (code) DO NOTHING;

-- ─── Deuda técnica: permisos y tipos de documento que faltaban documentar ─
-- (ver auditoría 2026-08-29 — ya existían en la base, usados en producción,
-- pero nunca habían quedado guardados en un script.)

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'expense', 'approve', 'Aprobar/rechazar gastos'),
  (gen_random_uuid(), 'finance', 'project_pledge', 'create', 'Registrar compromisos de aporte a proyectos'),
  (gen_random_uuid(), 'finance', 'project_pledge', 'delete', 'Eliminar compromisos de aporte')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.document_types (code, name, prefix)
VALUES
  ('donor_receipt', 'Comprobante de Donante', 'REC'),
  ('group_fund_expense', 'Gasto de Fondo de Grupo', 'GFO'),
  ('project_contribution_receipt', 'Comprobante de Aporte a Proyecto', 'APO'),
  ('project_expense', 'Gasto de Proyecto', 'GTO'),
  ('sale_invoice', 'Factura de venta', 'FAC'),
  ('sale_receipt', 'Recibo de venta', 'RCB')
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code IN ('finance.expense.approve', 'finance.project_pledge.create', 'finance.project_pledge.delete')
ON CONFLICT DO NOTHING;

-- ─── Proyectos: eliminar proyecto (sesión 2026-11-05) ──────────────────

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'project', 'delete', 'Eliminar proyectos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code = 'finance.project.delete'
ON CONFLICT DO NOTHING;

-- ─── General: pantalla de superadmin para activar/desactivar módulos ──
-- (sesión 2026-11-05). Permiso SIN asignar a role_permissions a propósito:
-- los endpoints son @SuperadminOnly() (bypasea el sistema de permisos por
-- completo) — este código solo existe para que MenusService oculte este
-- ítem a cualquier administrador de tenant (nadie más lo tiene asignado),
-- mientras que isSuperadmin ya hace que se vea todo sin importar permisos.

INSERT INTO seguridad.actions (code, name)
VALUES ('manage', 'Administrar')
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'core', 'tenant', 'manage', 'Administrar tenants y módulos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'core',
  'core.tenant.manage', 'Tenants', 'building-2', '/general/tenants', 6, 'GEN_TENANTS', 2
)
ON CONFLICT (code) DO NOTHING;

-- ─── Membresía: menú de Reportes ────────────────────────────────────────
-- (encontrado corriendo directo en el droplet, nunca había quedado
-- guardado en el repo — ver sesión 2026-11-05.)

INSERT INTO general.menus (parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
SELECT
    m.id, 'membership', 'membership.attendance.view', 'Reportes', 'bar-chart', '/membership/reports', 6, 'MEM_REPORTS', 2
FROM general.menus m
WHERE m.module_code = 'membership' AND m.route IS NULL
ON CONFLICT (code) DO NOTHING;

COMMIT;
