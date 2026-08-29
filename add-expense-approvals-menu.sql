-- Monitor de aprobaciones ("Mías" + admin de todo el tenant)
INSERT INTO general.menus (id, parent_id, module_code, permission_code, label, icon, route, sort_order, code, level)
VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000001',
  'finance',
  'finance.expense.approve',
  'Aprobaciones',
  'clipboard-check',
  '/finance/approvals',
  7,
  'FIN_APPROVALS',
  2
)
ON CONFLICT (code) DO NOTHING;
