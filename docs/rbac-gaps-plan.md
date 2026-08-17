# Plan de acción — gaps de RBAC

> Documento de plan, no de implementación todavía. Nace de una revisión puntual del sistema de permisos (2026-08-06): el mecanismo central de RBAC (`User → UserRole → Role → RolePermission → Permission`, `PermissionsGuard` global) está bien resuelto y ya pasó por varias rondas de corrección esta sesión (códigos de permiso, escalada de privilegios, editabilidad de roles de sistema). Lo que sigue son 5 gaps puntuales encontrados en esa revisión — ninguno invalida el diseño general, pero cada uno es una fuente concreta de riesgo o de deuda.

## Orden de prioridad

| # | Gap | Tipo | Esfuerzo | Prioridad | Estado |
|---|---|---|---|---|---|
| 1 | `POST /auth/refresh` roto | Bug funcional | Bajo | **P1** | ✅ Resuelto 2026-08-06 |
| 2 | Guard falla abierto sin `@RequirePermission` | Riesgo estructural | Bajo-medio | **P1** | ✅ Resuelto 2026-08-06 |
| 3 | Comentarios "Redis" desalineados con la realidad | Documentación | Trivial | P2 (se hace junto con #2) | ✅ Resuelto 2026-08-06 |
| 4 | Scope (institución/sucursal) fuera del RBAC | Riesgo estructural | Medio-alto, requiere diseño | P2 | ✅ Resuelto 2026-08-06 |
| 5 | `seguridad.user_menu_access` sin uso | Decisión pendiente | — | P3 | ✅ Eliminada 2026-08-06 |

---

## 1. `POST /auth/refresh` está roto (P1) — ✅ Resuelto

**Implementado tal como se propuso**: `AuthService` ahora factoriza `issueTokens(user, replacesTokenId?)`, usado por `login()` y `refresh()`. `refresh()` valida la firma JWT y además busca el hash (sha256, no bcrypt — el token ya es de alta entropía y bcrypt trunca a 72 bytes) en `RefreshToken`; si el token ya estaba `revokedAt` (reuso), revoca toda la familia de tokens activos del usuario. `logout()` revoca de verdad los refresh tokens del usuario en vez del no-op anterior. Archivo: `apps/api/src/modules/security/auth/auth.service.ts`.

**Problema**: `AuthService.refresh()` (`apps/api/src/modules/security/auth/auth.service.ts:130`) reconstruye la sesión llamando `this.login({ email: user.email, password: '' })`. Eso ejecuta `bcrypt.compare('', user.passwordHash)`, que en la práctica siempre da `false` — el endpoint termina lanzando 401 "Refresh token inválido o expirado" sin importar que el refresh token en sí sea válido. Efecto real: cada sesión muere a los 15 minutos (TTL del access token) en vez de renovarse silenciosamente.

**Por qué importa para RBAC**: no es un bug de permisos en sí, pero el modelo de "permisos frescos en cada refresh" depende de que refresh funcione. Hoy no cumple ni eso ni la promesa básica de sesión persistente.

**Causa raíz relacionada**: la tabla `seguridad.refresh_tokens` (con `tokenHash`, `expiresAt`, `revokedAt`, `replacedBy` — diseñada para rotación con detección de reuso) existe en el schema pero **no se usa en ningún lado** — ni se escribe al hacer login, ni se lee al hacer refresh, ni se marca `revokedAt` al hacer logout (`AuthService.logout` solo hace un `touch` de `updatedAt`, con un TODO explícito).

**Propuesta**:
1. En `login()`: generar el refresh token, guardar su hash (`bcrypt.hash` o `sha256`, no el token en claro) en `RefreshToken` junto con `expiresAt`.
2. En `refresh()`: verificar la firma JWT del refresh token (ya se hace), y además buscar su hash en `RefreshToken` — debe existir, no estar `revokedAt`, y no estar vencido. Si es válido, generar un nuevo par de tokens **sin pedir contraseña** (recalculando permisos frescos desde `UserRole`/`RolePermission`, igual que hace `login()` hoy pero factorizando esa parte en un método privado reusable, ej. `issueTokensFor(user)`), marcar el token viejo `revokedAt` + `replacedBy` apuntando al nuevo (rotación, ya modelado en el schema).
3. En `logout()`: marcar el/los refresh token(s) del usuario como `revokedAt` de verdad (hoy es un no-op disfrazado).
4. Bonus de seguridad casi gratis: si se intenta reusar un refresh token ya `revokedAt`, es señal de token robado — se puede revocar toda la familia de tokens del usuario (mismo patrón que ya sugiere el comentario del modelo `RefreshToken`).

**Archivos**: `apps/api/src/modules/security/auth/auth.service.ts` (refactor de `login`/`refresh`/`logout`), sin cambios de schema (la tabla ya existe, solo no se usa).

---

## 2. El guard falla abierto sin `@RequirePermission` (P1) — ✅ Resuelto

**Implementado tal como se propuso**: nuevo `apps/api/src/common/decorators/superadmin-only.decorator.ts`, `PermissionsGuard` lo reconoce y además cambia el default a fail-closed (`ForbiddenException` si no hay `@RequirePermission`, `@Public()` ni `@SuperadminOnly()`). Los 5 controladores (`currencies`, `countries`, `languages`, `institution-types`, `catalog-items`) ya usan `@SuperadminOnly()` en `create`/`update`, y sus services perdieron el `assertSuperadmin` manual (y el parámetro `user` que ya no usaban).

**Problema**: `PermissionsGuard.canActivate()` (`apps/api/src/common/guards/permissions.guard.ts:39`) retorna `true` cuando el handler no tiene `@RequirePermission` — incluso sin `@Public()`. Confirmé que 5 controladores dependen hoy de este comportamiento para sus endpoints de escritura: `currencies`, `countries`, `languages`, `institution-types`, `catalog-items` — el `create`/`update` no tiene decorador, y la protección real ocurre *dentro* del service con un `if (!user.isSuperadmin) throw ForbiddenException(...)` manual.

**Por qué importa**: hoy no hay ningún endpoint realmente desprotegido (los 5 casos sí están cubiertos, solo que en la capa equivocada), pero el default es peligroso — cualquier endpoint nuevo que alguien agregue sin acordarse del decorador queda abierto a cualquier usuario autenticado, sin error, sin warning. Es la clase de bug silencioso que ya costó una ronda de arreglos esta sesión (los códigos de permiso incorrectos).

**Propuesta**:
1. Crear un decorador `@SuperadminOnly()` (mismo patrón que `@Public()`) para los 5 casos reales — formaliza en el controlador algo que hoy solo se ve leyendo el service.
2. `PermissionsGuard` reconoce `@SuperadminOnly()`: si está presente, exige `user.isSuperadmin` y corta ahí (sin tocar `permissions[]`).
3. Cambiar el default: si un handler no tiene `@RequirePermission`, `@Public()` ni `@SuperadminOnly()` → **lanzar `ForbiddenException`** en vez de `return true`. Esto convierte "olvidé el decorador" de una fuga silenciosa a un 403 inmediato y obvio en pruebas.
4. Quitar el `if (!user.isSuperadmin) throw` manual de los 5 services (`currencies.service.ts`, `countries.service.ts`, `languages.service.ts`, `institution-types.service.ts`, `catalog-items.service.ts`) — ya no hace falta, el guard lo cubre.
5. Correr toda la suite de endpoints manualmente (o con el cliente HTTP) tras el cambio — el nuevo default fail-closed puede sacar a la luz algún otro endpoint interno que hoy dependa silenciosamente del fallback (ninguno detectado en la revisión, pero vale confirmarlo).

**Archivos**: nuevo `apps/api/src/common/decorators/superadmin-only.decorator.ts`; modificar `permissions.guard.ts`; los 5 pares controller/service listados arriba.

---

## 3. Comentarios de "Redis" desalineados (P2, junto con el punto 2) — ✅ Resuelto

**Problema**: `permissions.guard.ts` y `jwt.strategy.ts` describen los permisos como "cacheados en Redis". En la implementación real no hay Redis en ningún punto del flujo — los permisos van embebidos directo en el payload del JWT en el login y se leen de ahí. No es un bug funcional (embeber permisos en el JWT es una estrategia de cache válida y común), pero el comentario engaña a quien lo lea después.

**Propuesta**: reescribir los comentarios para que digan lo que el código realmente hace (permisos embebidos en el JWT, sin dependencia de Redis). No implica agregar Redis — solo si más adelante se quiere revocación de permisos más rápida que el TTL de 15 minutos del access token, ahí sí valdría la pena evaluar una blacklist en Redis; hoy no hay señal de que se necesite.

**Archivos**: `apps/api/src/common/guards/permissions.guard.ts`, `apps/api/src/modules/security/auth/strategies/jwt.strategy.ts`.

---

## 4. El scope (institución/sucursal) vive fuera del RBAC (P2, requiere diseño) — ✅ Resuelto

**Investigación previa a implementar cambió el diagnóstico**: de los 4 archivos que filtran por `institutionId`/`branchId` en todo el backend, 3 ya usaban las utilidades de scope correctamente. El único gap real (no solo teórico) encontrado fue en `UsersService.assignRole`: nunca verificaba que quien asigna un rol tuviera scope sobre la institución/sucursal indicada — corregido con el mismo patrón (`resolveInstitutionScope`/`resolveBranchScope`) ya usado en `branches.service.ts`.

Además, se construyó `ScopeGuard` + `@RequireScope()` (`apps/api/src/common/guards/scope.guard.ts`, `apps/api/src/common/decorators/require-scope.decorator.ts`) — declarativo, registrado globalmente (no-op sin el decorador), mismo criterio que `PermissionsGuard`/`@RequirePermission`. Reemplaza los métodos privados `assertInstitutionInScope`/`assertBranchAccessible` que antes vivían sueltos en `branches.service.ts` (había que acordarse de llamarlos a mano) por algo declarado en el controller e imposible de omitir en silencio. Aplicado en `branches.controller.ts`, `address.controller.ts`, `branch-schedules.controller.ts`, `branches-all.controller.ts`. Deliberadamente NO aplicado en `institutions.controller.ts` (su service ya combina tenant + scope en una sola query eficiente).

Queda como patrón listo para reusar cuando se construya el backend del módulo de Membresía (`persons`/`groups`/`events`, todos con scope de institución/sucursal).

**Problema**: `PermissionsGuard` solo responde "¿el usuario tiene el permiso X?" a nivel de acción — nunca "¿tiene el permiso X *para este branch/institución específico*?". Ese segundo nivel (el scope real de `UserRole.institutionId`/`branchId`) se resuelve hoy a mano, service por service, llamando utilidades como `resolveInstitutionScope`/`resolveBranchScope` (`apps/api/src/common/utils/institution-scope.util.ts`). No hay ningún mecanismo central que garantice que un service nuevo (o uno viejo, modificado sin cuidado) realmente llame esas funciones antes de tocar datos scopeados.

**Por qué importa**: de los dos bugs de seguridad reales que se corrigieron esta sesión, ambos salieron exactamente de este punto — `findAllForTenant` filtrando solo por institución y no por sucursal (fuga de datos entre sucursales de un mismo tenant), y la falta de un chequeo de scope al asignar el rol `superadmin`. El RBAC de acciones está sólido; el de alcance es el eslabón débil y probablemente donde aparecerá el próximo bug de este tipo si el sistema sigue creciendo (el módulo de Membresía, por ejemplo, va a tener exactamente este mismo problema desde el día uno).

**Propuesta** (a nivel de diseño, no de implementación inmediata — esto merece su propia sesión de planeación antes de tocar código):
- Opción incremental, bajo riesgo: una función de test/auditoría que recorra todos los métodos de service que reciben `RequestUser` y toquen modelos con `institutionId`/`branchId`, y falle si no hay evidencia de que se llamó una función de `institution-scope.util.ts` en el cuerpo — más una checklist en el PR/code-review, no un mecanismo en runtime.
- Opción estructural, mayor esfuerzo: mover la resolución de scope a un decorador/interceptor (`@RequireScope('branch')`) parecido a `@RequirePermission`, que calcule el scope una vez por request (igual que ya se hace con `tenantId` vía `TenantRlsInterceptor`) y lo deje disponible vía `@CurrentScope()`, en vez de que cada service lo recalcule por su cuenta. Esto es justo el tipo de cambio transversal (toca todos los services que manejan datos scopeados) que ya se decidió tratar con cuidado esta sesión para el `SET LOCAL` de RLS — el mismo criterio aplicaría aquí: diseñarlo primero, no empezar a tocar archivos.
- Estas dos opciones no son excluyentes: la auditoría (opción incremental) puede servir de red de seguridad *mientras* se diseña la opción estructural con calma.

**No se propone una implementación concreta en este documento** — es el gap más grande de los cinco y amerita su propia conversación de diseño antes de escribir código.

---

## 5. `seguridad.user_menu_access` sin uso (P3, decisión pendiente) — ✅ Eliminada

El usuario decidió eliminarla (los roles + scope de `UserRole` ya cubren lo necesario). Quitada del schema de Prisma (modelo + relaciones inversas en `User` y `Menu`) y de la base con `DROP TABLE seguridad.user_menu_access;`.

**Problema**: la tabla `UserMenuAccess` (`apps/api/prisma/schema/seguridad.prisma:176-196`) modela un ACL granular por usuario y por menú (`canView`/`canCreate`/`canUpdate`/`canDelete`/`canExport` + `filters` JSON libre) — pero no tiene ni una sola referencia en `apps/api/src`. No es un bug; es una tabla completamente diseñada pero nunca conectada a ningún endpoint ni service.

**Propuesta**: no es un gap que se "arregle" — es una decisión que falta tomar. Dos caminos:
- Si la intención sigue siendo tener overrides de acceso por usuario más finos que por rol (ej. "este usuario en particular no puede exportar, aunque su rol sí pueda"), queda como trabajo futuro explícito, documentado como tal.
- Si ya no aplica al diseño actual (los roles + scope de `UserRole` cubren lo que hace falta), se puede eliminar del schema para no dejar superficie muerta que alguien confunda con un mecanismo activo.

Este documento no toma la decisión — solo la deja registrada para cuando se quiera resolver.

---

## Verificación (para cuando se implemente cada punto)

- **Punto 1 (refresh)**: login → esperar a que expire el access token (o forzar `expiresIn` corto en dev) → llamar `/auth/refresh` con el refresh token → confirmar 200 con tokens nuevos, no 401. Confirmar que reusar el refresh token viejo después de rotarlo falla.
- **Punto 2 (guard fail-closed)**: crear temporalmente un endpoint de prueba sin ningún decorador → confirmar que da 403, no 200. Confirmar que los 5 controladores de catálogo siguen bloqueando `create`/`update` a un usuario no-superadmin, ahora vía `@SuperadminOnly()` en vez del check manual.
- **Punto 4 (scope)**: no aplica todavía — es la sesión de diseño la que define su propia verificación.
