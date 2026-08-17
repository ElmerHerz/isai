import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { MenuNode } from '@isai/shared-types';

interface FlatMenu {
  id: string;
  parentId: string | null;
  code: string;
  label: string;
  icon: string | null;
  route: string | null;
  level: number;
  sortOrder: number;
  module: { code: string; colorHex: string };
}

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menú efectivo del usuario autenticado: filtrado por módulos activos de su
   * tenant y por los permisos que tiene (o sin filtro si es superadmin).
   *
   * tenantId === null (superadmin sin ?tenantId= elegido) → no se filtra por
   * módulo, mismo criterio que ya usan institutions/branches para tenant null.
   */
  async findMyMenu(
    tenantId: string | null,
    userPermissions: string[],
    isSuperadmin: boolean,
  ): Promise<MenuNode[]> {
    let moduleCodeFilter: string[] | undefined;

    if (tenantId) {
      const tenantModules = await this.prisma.tenantModule.findMany({
        where: {
          tenantId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { moduleCode: true },
      });
      moduleCodeFilter = tenantModules.map((tm) => tm.moduleCode);
    }

    const menus = await this.prisma.menu.findMany({
      where: {
        isActive: true,
        ...(moduleCodeFilter ? { moduleCode: { in: moduleCodeFilter } } : {}),
      },
      include: { module: { select: { code: true, colorHex: true } } },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    const passesPermission = (permissionCode: string | null) =>
      isSuperadmin || permissionCode === null || userPermissions.includes(permissionCode);

    const passedPermission = menus.filter((m) => passesPermission(m.permissionCode));
    const passedIds = new Set(passedPermission.map((m) => m.id));

    // Un menú sin ruta (header puro, ej. "Seguridad") solo sobrevive si algún
    // sobreviviente lo tiene como parentId — se propaga hacia arriba por si
    // la jerarquía llega a tener más de 2 niveles en el futuro.
    const hasVisibleChild = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of passedPermission) {
        if (
          m.parentId &&
          passedIds.has(m.parentId) &&
          (m.route !== null || hasVisibleChild.has(m.id)) &&
          !hasVisibleChild.has(m.parentId)
        ) {
          hasVisibleChild.add(m.parentId);
          changed = true;
        }
      }
    }

    const finalNodes: FlatMenu[] = passedPermission
      .filter((m) => m.route !== null || hasVisibleChild.has(m.id))
      .map((m) => ({
        id: m.id,
        parentId: m.parentId,
        code: m.code,
        label: m.label,
        icon: m.icon,
        route: m.route,
        level: m.level,
        sortOrder: m.sortOrder,
        module: m.module,
      }));

    return buildTree(finalNodes);
  }
}

function buildTree(flat: FlatMenu[]): MenuNode[] {
  const byId = new Map<string, MenuNode>();
  for (const m of flat) {
    byId.set(m.id, {
      id: m.id,
      code: m.code,
      label: m.label,
      icon: m.icon,
      route: m.route,
      level: m.level,
      sortOrder: m.sortOrder,
      module: m.module,
      children: [],
    });
  }

  const roots: MenuNode[] = [];
  for (const m of flat) {
    const node = byId.get(m.id);
    if (!node) continue;

    const parent = m.parentId ? byId.get(m.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: MenuNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(roots);

  return roots;
}
