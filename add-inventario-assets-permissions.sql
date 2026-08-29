-- Inventario, Rebanada 3 (docs/comercio-mejoras-propuestas.md §6 — Activos)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar) y
-- asigna los permisos a los roles que corresponda desde Roles en la UI.

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'inventory', 'asset', 'view',   'Ver activos'),
  (gen_random_uuid(), 'inventory', 'asset', 'create', 'Crear activos'),
  (gen_random_uuid(), 'inventory', 'asset', 'update', 'Editar activos (custodia, ubicación, condición, dar de baja)')
ON CONFLICT (code) DO NOTHING;

-- Fila hija bajo el mismo padre "Inventario" ya sembrado en la Rebanada 1
-- (50000000-0000-0000-0000-000000000001), junto a "Productos".
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '50000000-0000-0000-0000-000000000001',
  'inventory',
  'inventory.asset.view',
  'Activos',
  'warehouse',
  '/inventory/assets',
  2,
  'INV_ASSETS',
  2
)
ON CONFLICT (code) DO NOTHING;
