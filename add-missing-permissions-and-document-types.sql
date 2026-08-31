-- Deuda técnica de sesiones anteriores: estos permisos y tipos de documento
-- ya existían en la base local (los usa el código en producción hace
-- tiempo) pero nunca quedaron guardados en un script — se sembraron a mano
-- alguna vez y se perdió el registro. Salieron a la luz al desplegar el
-- droplet desde cero el 2026-08-29 (Aprobar gasto de proyecto y Compromisos
-- fallaban con "permiso no existe"; Gastos de Proyecto/Fondo de Grupo/
-- Comprobante de Donante/Ventas fallaban con "tipo de documento no existe").
-- Corre esto tú mismo contra la base (dev y luego cualquier droplet nuevo).

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

-- Asignar los permisos nuevos a Administrador y Demo (todo excepto
-- seguridad) — mismo criterio que el resto de scripts de esta sesión.
INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code IN ('finance.expense.approve', 'finance.project_pledge.create', 'finance.project_pledge.delete')
ON CONFLICT DO NOTHING;
