-- Aprobación de gastos — rediseño como ruta multi-paso (reemplaza los
-- permisos de umbral plano de la pasada anterior, que nadie llegó a
-- asignar a ningún rol todavía).
-- Corre esto tú mismo contra la base (dev y luego droplet al desplegar) y
-- asigna los permisos a los roles que corresponda desde Roles en la UI.

DELETE FROM seguridad.permissions WHERE code LIKE 'finance.approval_threshold.%';

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'approval_route', 'view',   'Ver rutas de aprobación de gastos'),
  (gen_random_uuid(), 'finance', 'approval_route', 'create', 'Crear rutas de aprobación de gastos'),
  (gen_random_uuid(), 'finance', 'approval_route', 'update', 'Editar rutas de aprobación de gastos')
ON CONFLICT (code) DO NOTHING;

-- finance.expense.approve ya existe de la pasada anterior, sin cambios.
