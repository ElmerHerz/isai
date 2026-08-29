-- Cierre de periodo formal (Fase 4, docs/finanzas-mejoras-propuestas.md §9.1)
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar) y
-- asigna los permisos a los roles que corresponda desde Roles en la UI —
-- "reopen" es de hecho de solo-superadmin (el servicio lo bloquea también a
-- nivel de código), pero se deja el permiso por si se quiere ver en el menú.

-- 'reopen' no existía como action_code global — se agrega (mismo criterio
-- que 'approve'/'revoke', un verbo reusable por cualquier módulo futuro).
INSERT INTO seguridad.actions (code, name)
VALUES ('reopen', 'Reabrir')
ON CONFLICT (code) DO NOTHING;

-- code es una columna GENERATED ALWAYS (module_code.resource.action_code) —
-- no se inserta directo.
INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'period_closing', 'view',   'Ver cierres de periodo'),
  (gen_random_uuid(), 'finance', 'period_closing', 'create', 'Cerrar un periodo contable'),
  (gen_random_uuid(), 'finance', 'period_closing', 'reopen', 'Reabrir un periodo cerrado (solo superadmin)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000001',
  'finance',
  'finance.period_closing.view',
  'Cierre de periodo',
  'lock',
  '/finance/period-closings',
  6,
  'FIN_PERIOD_CLOSINGS',
  2
)
ON CONFLICT (code) DO NOTHING;
