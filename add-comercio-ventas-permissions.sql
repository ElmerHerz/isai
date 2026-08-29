-- Comercio, Rebanada 2 (docs/comercio-mejoras-propuestas.md §5 — Clientes + Ventas)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar).
-- Al final ya deja los permisos asignados a Administrador y Demo (mismo
-- criterio que Compras) — no depende de tener acceso a Seguridad en la UI.

-- El módulo 'store' ya existe (sembrado en la Rebanada 1 de Compras).
INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'store', 'customer', 'view',   'Ver clientes'),
  (gen_random_uuid(), 'store', 'customer', 'create', 'Crear clientes'),
  (gen_random_uuid(), 'store', 'customer', 'update', 'Editar clientes'),
  (gen_random_uuid(), 'store', 'sale',     'view',   'Ver ventas'),
  (gen_random_uuid(), 'store', 'sale',     'create', 'Registrar ventas')
ON CONFLICT (code) DO NOTHING;

-- Hijas bajo el mismo "Comercio" ya sembrado (70000000-0000-0000-0000-000000000001),
-- junto a "Proveedores" (sort_order 1) y "Compras" (sort_order 2).
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '70000000-0000-0000-0000-000000000001',
  'store',
  'store.customer.view',
  'Clientes',
  'users',
  '/store/customers',
  3,
  'STORE_CUSTOMERS',
  2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '70000000-0000-0000-0000-000000000001',
  'store',
  'store.sale.view',
  'Ventas',
  'credit-card',
  '/store/sales',
  4,
  'STORE_SALES',
  2
)
ON CONFLICT (code) DO NOTHING;

-- Asignar los 5 permisos nuevos a Administrador y a Demo (todo excepto
-- seguridad) — mismos roles de prueba de siempre.
INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.module_code = 'store'
  AND p.resource IN ('customer', 'sale')
ON CONFLICT DO NOTHING;
