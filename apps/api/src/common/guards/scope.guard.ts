import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { SCOPE_KEY, RequireScopeOptions } from '../decorators/require-scope.decorator';
import { resolveInstitutionScope, resolveBranchScope } from '../utils/institution-scope.util';
import { resolveTenantId } from '../utils/resolve-tenant-id';
import type { RequestUser } from '../decorators/current-user.decorator';

/**
 * ScopeGuard — Afirma acceso a UN recurso (institución/sucursal) identificado
 * por un route param, según @RequireScope() del handler. Sin el decorador,
 * no hace nada (pass-through) — igual de seguro para todo lo que no lo use.
 *
 * Reemplaza los métodos privados que antes vivían sueltos en cada service
 * (ver branches.service.ts) por un único punto declarativo, mismo criterio
 * que PermissionsGuard/@RequirePermission. 404, nunca 403 — no revela que
 * el recurso existe fuera del alcance del usuario.
 *
 * Deliberadamente NO se usa en institutions.controller.ts: su service ya
 * combina tenant + scope en una sola query eficiente; agregar este guard
 * ahí solo sumaría una consulta redundante sin mejorar la seguridad real.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RequireScopeOptions>(SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user || user.isSuperadmin) return true;

    const params = request.params as Record<string, string>;

    if (options.level === 'institution') {
      const institutionId = params[options.institutionIdParam ?? 'institutionId']!;
      const scope = await resolveInstitutionScope(this.prisma, user);
      if (!scope.unrestricted && !scope.institutionIds.includes(institutionId)) {
        throw new NotFoundException(`Institución "${institutionId}" no encontrada`);
      }
      return true;
    }

    const branchId = params[options.branchIdParam ?? 'branchId']!;
    let institutionId = options.institutionIdParam ? params[options.institutionIdParam] : undefined;

    if (!institutionId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { institutionId: true },
      });
      if (!branch) throw new NotFoundException(`Sucursal "${branchId}" no encontrada`);
      institutionId = branch.institutionId;
    }

    const tenantId = resolveTenantId(request);
    if (tenantId) {
      const belongsToTenant = await this.prisma.branch.findFirst({
        where: { id: branchId, institution: { tenantId } },
        select: { id: true },
      });
      if (!belongsToTenant) throw new NotFoundException(`Sucursal "${branchId}" no encontrada`);
    }

    const institutionScope = await resolveInstitutionScope(this.prisma, user);
    if (!institutionScope.unrestricted && !institutionScope.institutionIds.includes(institutionId)) {
      throw new NotFoundException(`Sucursal "${branchId}" no encontrada`);
    }

    const branchScope = await resolveBranchScope(this.prisma, { ...user, institutionId });
    if (!branchScope.unrestricted && !branchScope.branchIds.includes(branchId)) {
      throw new NotFoundException(`Sucursal "${branchId}" no encontrada`);
    }

    return true;
  }
}
