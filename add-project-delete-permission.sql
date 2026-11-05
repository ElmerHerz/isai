-- Proyectos: permiso para eliminar un proyecto completo (DELETE /projects/:id).
-- Corre esto tú mismo contra la base (dev y luego el droplet al desplegar).

INSERT INTO seguridad.permissions (id, module_code, resource, action_code, name)
VALUES
  (gen_random_uuid(), 'finance', 'project', 'delete', 'Eliminar proyectos')
ON CONFLICT (code) DO NOTHING;

-- Asignar el permiso nuevo a Administrador y Demo (mismo criterio de
-- siempre: todo excepto seguridad).
INSERT INTO seguridad.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM seguridad.roles r
CROSS JOIN seguridad.permissions p
WHERE r.id IN ('39dddea5-8048-421e-be8e-797f2656942b', 'e0464193-235b-4bd5-acee-bf1676ec2719')
  AND p.code = 'finance.project.delete'
ON CONFLICT DO NOTHING;
