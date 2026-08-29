-- Rutas de Aprobación — pantalla de configuración (por persona, no por rol)
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000001',
  'finance',
  'finance.approval_route.view',
  'Rutas de Aprobación',
  'file-check',
  '/finance/approval-routes',
  6,
  'FIN_APPROVAL_ROUTES',
  2
)
ON CONFLICT (code) DO NOTHING;
