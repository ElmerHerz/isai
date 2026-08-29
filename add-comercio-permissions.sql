-- Comercio, Rebanada 1 (docs/comercio-mejoras-propuestas.md §4 — Proveedores + Compras)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar).
-- Al final ya deja los permisos asignados a Administrador y Demo (mismo
-- criterio que Inventario) — no depende de tener acceso a Seguridad en la UI.

-- general.modules no tenía fila 'store' sembrada todavía (a diferencia de
-- 'inventory', que sí se sembró en su rebanada 1).
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

-- Encabezado de nivel raíz del sidebar (parent_id NULL) — mismo patrón que
-- Inventario (sort_order 50); Comercio es el siguiente: 60.
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  NULL,
  'store',
  NULL,
  'Comercio',
  'shopping-cart',
  NULL,
  60,
  'STORE',
  1
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '70000000-0000-0000-0000-000000000001',
  'store',
  'store.supplier.view',
  'Proveedores',
  'truck',
  '/store/suppliers',
  1,
  'STORE_SUPPLIERS',
  2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '70000000-0000-0000-0000-000000000001',
  'store',
  'store.purchase.view',
  'Compras',
  'receipt',
  '/store/purchases',
  2,
  'STORE_PURCHASES',
  2
)
ON CONFLICT (code) DO NOTHING;

-- Asignar los 6 permisos nuevos a Administrador y a Demo (todo excepto
-- seguridad) — mismos roles de prueba a los que ya se les dio inventory.*.
-- Vía SQL directo porque asignar desde Roles en la UI requiere el permiso
-- de Seguridad, que Demo no tiene.
INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.module_code = 'store'
ON CONFLICT DO NOTHING;
