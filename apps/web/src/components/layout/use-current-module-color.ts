import { useCurrentMenuNode } from './use-current-menu-node';

/**
 * useCurrentModuleColor — el color hex del módulo dueño de la ruta actual
 * (general.modules.color_hex). Así cada pantalla puede acentuarse con el
 * color de su módulo sin tener que hardcodearlo página por página.
 */
export function useCurrentModuleColor(): string {
  return useCurrentMenuNode().colorHex;
}
