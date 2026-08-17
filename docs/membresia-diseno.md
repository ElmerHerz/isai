# ISAI — Módulo de Membresía (contexto de diseño)

> Complementa a `CLAUDE.md`. Este documento explica el **por qué** detrás del diseño del módulo de membresía, no solo el qué — para que cualquier sesión de Claude Code entienda las decisiones sin tener que volver a discutirlas.
>
> **Estado: implementado en base de datos y en el schema de Prisma (2026-08-06).** Este documento reemplaza la propuesta original de esta misma sesión (que dejaba Eventos/Asistencia fuera de v1 y proponía una tabla `person_groups` simple) — el diseño real que se ejecutó, descrito abajo, es más completo: sí incluye Eventos/Asistencia desde el día uno, y `group_members` lleva historial de entradas/salidas en vez de ser una simple tabla puente. Falta construir el backend (NestJS) y el frontend — solo existen las tablas y el schema de Prisma.

---

## 1. Objetivo del módulo

Gestionar personas y su pertenencia a grupos dentro de una institución. Nació pensando en una **iglesia real ya en uso** ("Príncipe de Paz", tenant `9b2b1e28-2579-4410-8060-cd6d76b62925`): miembros, visitantes, células, sociedades, directivas.

**Decisión de diseño clave: el módulo se construyó deliberadamente GENÉRICO**, no exclusivo de iglesias. Debe poder reutilizarse para:
- Una **tienda/supermercado**: `persons` = empleados/clientes, `groups` = departamentos/turnos.
- Una **farmacia**: `persons` = empleados, capacitaciones de personal.
- Cualquier institución que necesite agrupar personas y tomar asistencia a eventos.

No se crearon tablas nuevas específicas de iglesia (`members`, `cells`, `societies` como tablas separadas) — todo pasa por las entidades genéricas `persons` y `groups` con un `type` que las tipifica.

---

## 2. Entidades y por qué se modelaron así

### `membresia.persons`
Persona relacionada con una institución (miembro, visitante, empleado, cliente, voluntario — vía `person_type_id`, que reutiliza el catálogo genérico `general.catalog_items` con `catalog_code = 'person_type'`).

- `tenant_id` está **directo** en la tabla (no solo vía `institution_id`) para que la política RLS sea simple y rápida — mismo patrón que `seguridad.users`.
- **Riesgo a tener presente al construir el backend**: nada en la base impide que `tenant_id` e `institution_id` queden inconsistentes entre sí (el FK de `institution_id` solo valida que la institución exista, no que sea del tenant correcto). El service de `persons` **debe derivar `tenant_id` en el servidor siempre a partir de `institution_id`** (o del tenant de la request autenticada), nunca aceptar un `tenant_id` que mande el cliente.
- La dirección NO reutiliza `general.addresses` (esa tabla solo admite `institution_id` o `branch_id` como dueño). Se agregaron campos de texto simples (`address_line`, `city`) para no complicar el `CHECK` de `addresses`. Si más adelante se necesita una dirección estructurada completa por persona, hay que ampliar `addresses` o crear una variante.

### `membresia.groups`
Grupo genérico. El `group_type_id` (mismo patrón de `catalog_items`, `catalog_code = 'group_type'`) es lo que le da significado: `TAG`, `CELL`, `SOCIETY`, `BOARD`, `ZONE`, `DEPARTMENT`, `TEAM`.

**Por qué una sola tabla `groups` en vez de `tags`, `cells`, `societies`, `boards` separadas:** todas son estructuralmente lo mismo (un conjunto de personas con un líder opcional). Diferenciarlas por tabla habría significado 4 tablas casi idénticas y 4 tablas de pertenencia — se prefirió normalizar.

`parent_group_id` (self-referencia) es **opcional y sin usar por defecto**. Se dejó ahí porque las células pueden organizarse "por zonas" — si algún día se necesita agrupar células bajo una zona formal, la estructura ya lo soporta sin migración. No es obligatorio poblarlo.

### `membresia.group_members` — pertenencia CON historial
**Decisión importante:** NO tiene PK compuesta `(group_id, person_id)`. Tiene `id` propio, porque se pidió llevar historial completo de entradas/salidas — una persona puede entrar, salir, y volver a entrar al mismo grupo años después, y cada periodo debe quedar registrado.

La integridad se protege con un **índice único parcial**:
```sql
CREATE UNIQUE INDEX uq_group_members_open ON membresia.group_members(group_id, person_id)
    WHERE left_at IS NULL;
```
Esto impide que una persona tenga dos membresías *abiertas* simultáneas al mismo grupo, pero permite múltiples filas cerradas en el tiempo. **No es representable en Prisma** — el service debe verificar explícitamente que no exista ya una fila con `leftAt: null` antes de crear una nueva (el índice es la red de seguridad final si el service falla en verificarlo).

### `membresia.group_positions` — directivas CON vigencia
Se separó de `group_members` a propósito porque tiene una regla distinta: cargos de directiva (presidente, secretario, tesorero — catálogo `board_position`) con `term_start`/`term_end`. Alguien puede ser "miembro" de la Sociedad de Jóvenes de forma continua (`group_members`) mientras ocupa el cargo de Tesorero solo durante 2024-2026 (`group_positions`). Son conceptos distintos, por eso son tablas distintas.

---

## 3. Eventos y asistencia (submódulo dentro de `membresia`)

### `membresia.events`
Una ocurrencia concreta (no un horario recurrente — eso ya vive en `general.branch_schedules`). El **scope** de a quién aplica lo determina la combinación de campos:

| `group_id` | `branch_id` | Significado |
|---|---|---|
| `NULL` | `NULL` | Aplica a toda la institución |
| `NULL` | con valor | Aplica a toda esa sucursal (ej: capacitación de SSO en una sucursal específica) |
| con valor | (irrelevante) | Aplica SOLO a los miembros actuales de ese grupo (ej: culto de jóvenes) |

`schedule_id` (opcional) permite vincular el evento concreto al horario recurrente del que "nació" (ej: este culto del 3 de agosto viene del horario "Culto Dominical").

### `membresia.event_attendance`
Un registro por persona por evento. `status_id` usa el catálogo `attendance_status` (PRESENT, ABSENT, EXCUSED, LATE).

**Campo `extra_data` (JSONB) — decisión deliberada y su trade-off:**
Cosas como "llevaba uniforme" o "cumplió con la tarea asignada" varían demasiado entre iglesia/tienda/farmacia como para ser columnas fijas. Se resolvió con JSONB libre.

**ADVERTENCIA para quien construya el frontend/backend de esto:** `extra_data` no tiene validación de esquema a nivel de base de datos. Si el frontend permite escribir claves libres, se va a terminar con `"llevaba_uniforme"` un día y `"lleva_uniforme"` otro, rompiendo cualquier reporte agregado. **El frontend debe definir un formulario fijo de preguntas por tipo de evento** (aunque sea hardcodeado por ahora) y construir el JSON con claves consistentes — nunca dejar que el usuario final escriba la clave a mano. Si esto se vuelve un problema real, la solución futura es una tabla `event_type_checklist_fields` que defina qué preguntas aplican a cada `event_type_id`.

---

## 4. Cómo arma el frontend la lista de personas para pasar asistencia

```sql
-- A) Evento CON group_id (ej: culto de jóvenes): solo miembros actuales del grupo
SELECT p.* FROM membresia.persons p
JOIN membresia.group_members gm ON gm.person_id = p.id
WHERE gm.group_id = :group_id AND gm.left_at IS NULL;

-- B) Evento SIN group_id (asistencia general / capacitación de sucursal o institución completa)
SELECT p.* FROM membresia.persons p
WHERE p.institution_id = :institution_id
  AND (:branch_id IS NULL OR p.branch_id = :branch_id)
  AND p.is_active = TRUE;
```

En el caso A, la pantalla también debe permitir **registrar a alguien nuevo al vuelo** (ej: un visitante que llegó al culto de jóvenes sin estar registrado) — eso simplemente crea una fila nueva en `persons` con `person_type_id` = VISITOR y, opcionalmente, se agrega a `group_members` en el momento.

---

## 5. Cómo se conecta con lo que ya existía

- `general.branch_schedules` se amplió con un `group_id` opcional (FK a `membresia.groups`) — así "Culto de Jóvenes" es un horario más, vinculado a la sociedad "Jóvenes", **reutilizando** la tabla que ya existía en vez de duplicarla. La FK se creó como `ON DELETE CASCADE` (borrar el grupo borra sus horarios); queda pendiente cambiarla a `ON DELETE SET NULL` (desvincular en vez de borrar) — ver sección 6.
- Los catálogos nuevos (`person_type`, `group_type`, `board_position`, `attendance_status`) y las extensiones a `schedule_type` (se agregaron `TRAINING`, `CONVENTION`, `MEETING`) todos viven en `general.catalog_items` — el patrón genérico que ya existía para listas pequeñas, sin crear tablas de catálogo dedicadas nuevas.
- Permisos nuevos siguen la convención ya establecida (`module_code='membership'`, `resource`, `action_code`) — ej: `membership.person.view`, `membership.event.view`, `membership.attendance.create`.
- Menús nuevos cuelgan del menú padre `MEMBERSHIP` ya creado (`code`, `level`, `module_code`, `permission_code`) — mismo patrón que Seguridad y General.
- El schema de Prisma (`apps/api/prisma/schema/membresia.prisma`) ya modela las 6 tablas, con las relaciones inversas agregadas a `Tenant`, `Institution`, `Branch`, `CatalogItem`, `BranchSchedule` (general) y `User` (seguridad).

---

## 6. Estado de ejecución en la base de datos

✅ Ejecutado el 2026-08-06 (`isai_pendiente_ejecutar_v2.sql`):
1. Fix defensivo de RLS en `general.branch_schedules` (ya estaba aplicado de antes, el script lo detectó y no hizo nada).
2. Módulo de membresía completo (`persons`, `groups`, `group_members` con historial, `group_positions` con vigencia).
3. Eventos y asistencia (`events`, `event_attendance`).

Todo con RLS activado y verificado (`rowsecurity = true` + política `tenant_isolation_<tabla>` en las 6 tablas). El módulo `membership` está activo en `general.tenant_modules` para el tenant "Príncipe de Paz".

✅ Schema de Prisma actualizado y `prisma generate` corrido — el `PrismaClient` ya conoce las 6 tablas.

**Pendiente:**
- Cambiar `branch_schedules.group_id` de `ON DELETE CASCADE` a `ON DELETE SET NULL`:
  ```sql
  ALTER TABLE general.branch_schedules DROP CONSTRAINT branch_schedules_group_id_fkey;
  ALTER TABLE general.branch_schedules ADD CONSTRAINT branch_schedules_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES membresia.groups(id) ON DELETE SET NULL;
  ```
- No existe todavía ningún controller/service de NestJS ni pantalla de frontend para este módulo — solo la base de datos y el ORM están listos.

---

## 7. Decisiones abiertas / cosas a validar con el backend

- La coherencia entre `institutions.type_code` y en qué tabla `*_details` tiene fila **no se valida en la BD**, debe forzarse en el backend (NestJS).
- `persons.tenant_id` debe derivarse siempre en el servidor desde `institution_id` (ver sección 2) — nunca confiar en lo que mande el cliente.
- `extra_data` en `event_attendance` necesita que el backend/frontend impongan disciplina de claves (ver sección 3).
- Falta decidir si `group_members.role` (ahora texto libre: `'member'`, `'leader'`, `'co_leader'`) debería normalizarse a un catálogo — se dejó libre a propósito para no sobre-diseñar antes de ver uso real.
- Antes de construir el módulo de backend, revisar `docs/rbac-gaps-plan.md` — en particular el punto 2 (el guard falla abierto sin `@RequirePermission`): los controllers nuevos de este módulo deben marcar explícitamente cada endpoint desde el principio para no heredar ese gap.
