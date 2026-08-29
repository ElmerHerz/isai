-- Inventario, Rebanada 1 (docs/comercio-mejoras-propuestas.md §1-§2)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar) y
-- asigna los permisos a los roles que corresponda desde Roles en la UI.

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'inventory', 'product', 'view',   'Ver catálogo de productos'),
  (gen_random_uuid(), 'inventory', 'product', 'create', 'Crear productos'),
  (gen_random_uuid(), 'inventory', 'product', 'update', 'Editar productos')
ON CONFLICT (code) DO NOTHING;

-- Encabezado de nivel raíz del sidebar (parent_id NULL, sin route/permission_code
-- propio) — mismo patrón exacto que Seguridad/General/Membresía/Finanzas
-- (sort_order en decenas: 10/20/30/40, este es el siguiente: 50). Inventario
-- es su propio módulo raíz, no cuelga de Finanzas — general.modules ya tenía
-- la fila 'inventory' sembrada de antes (sin usar hasta ahora).
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  NULL,
  'inventory',
  NULL,
  'Inventario',
  'package',
  NULL,
  50,
  'INVENTORY',
  1
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '50000000-0000-0000-0000-000000000001',
  'inventory',
  'inventory.product.view',
  'Productos',
  'package',
  '/inventory/products',
  1,
  'INV_PRODUCTS',
  2
)
ON CONFLICT (code) DO NOTHING;
