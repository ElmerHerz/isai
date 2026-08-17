import { useRouterState } from '@tanstack/react-router';
import type { MenuNode } from '@isai/shared-types';
import { useMyMenuQuery } from '@/modules/general';

export const FALLBACK_MODULE_COLOR = '#6366f1';

interface CurrentMenuInfo {
  /** Etiqueta de la sección padre (ej. "General"), null si no aplica. */
  sectionLabel: string | null;
  /** Etiqueta del ítem activo (ej. "Sucursales"), null si no hay match. */
  itemLabel: string | null;
  colorHex: string;
}

interface Match {
  info: CurrentMenuInfo;
  /** Longitud de node.route — para preferir el match más específico. */
  matchLength: number;
}

// Match por prefijo, no exacto: una página de detalle como
// /membership/groups/:groupId no tiene su propio ítem de menú (solo
// /membership/groups lo tiene), así que "pertenece" al ítem cuya route es
// prefijo de la ruta activa. Se prefiere el match más largo (más
// específico) si hubiera más de uno posible.
function findCurrentNode(
  nodes: MenuNode[],
  pathname: string,
  parentLabel: string | null,
): Match | null {
  let best: Match | null = null;

  for (const node of nodes) {
    if (node.route && (pathname === node.route || pathname.startsWith(`${node.route}/`))) {
      if (!best || node.route.length > best.matchLength) {
        best = {
          info: { sectionLabel: parentLabel, itemLabel: node.label, colorHex: node.module.colorHex },
          matchLength: node.route.length,
        };
      }
    }

    const childMatch = findCurrentNode(node.children, pathname, node.label);
    if (childMatch && (!best || childMatch.matchLength > best.matchLength)) {
      best = childMatch;
    }
  }

  return best;
}

/**
 * useCurrentMenuNode — dado /menus/me y la ruta activa, devuelve la
 * sección+ítem del sidebar que le corresponde y el color de su módulo.
 * Usado por el header (breadcrumb) y por useCurrentModuleColor (acentos).
 */
export function useCurrentMenuNode(): CurrentMenuInfo {
  const { data: menu } = useMyMenuQuery();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const empty: CurrentMenuInfo = { sectionLabel: null, itemLabel: null, colorHex: FALLBACK_MODULE_COLOR };
  if (!menu) return empty;
  return findCurrentNode(menu, pathname, null)?.info ?? empty;
}
