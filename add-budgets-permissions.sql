-- Presupuestos (Fase 2, docs/finanzas-mejoras-propuestas.md §7.1)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar) y
-- asigna los permisos a los roles que corresponda desde Roles en la UI —
-- mismo flujo que se usó para Fondos de Grupo.

-- code es una columna GENERATED ALWAYS (module_code.resource.action_code) —
-- no se inserta directo.
INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'budget', 'view',   'Ver presupuestos'),
  (gen_random_uuid(), 'finance', 'budget', 'create', 'Crear presupuestos'),
  (gen_random_uuid(), 'finance', 'budget', 'update', 'Editar presupuestos (incluye líneas)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000001',
  'finance',
  'finance.budget.view',
  'Presupuestos',
  'piggy-bank',
  '/finance/budgets',
  5,
  'FIN_BUDGETS',
  2
)
ON CONFLICT (code) DO NOTHING;
