-- Comercio — Reportería básica de tienda (docs/comercio-mejoras-propuestas.md
-- §Fase 2, paso 8 del orden recomendado).
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar).
-- Ya deja el permiso asignado a Administrador y Demo (Demo no tiene acceso
-- a Seguridad para hacerlo desde la UI — mismo criterio que el resto de
-- Comercio).

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES (gen_random_uuid(), 'store', 'report', 'view', 'Ver reportes de tienda')
ON CONFLICT (code) DO NOTHING;

-- Hija bajo el mismo "Comercio" ya sembrado (70000000-0000-0000-0000-000000000001),
-- después de "Ventas" (sort_order 5).
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '70000000-0000-0000-0000-000000000001',
  'store',
  'store.report.view',
  'Reportes',
  'bar-chart',
  '/store/reports',
  5,
  'STORE_REPORTS',
  2
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code = 'store.report.view'
ON CONFLICT DO NOTHING;
