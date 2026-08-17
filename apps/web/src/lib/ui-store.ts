import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UiStore — preferencias de UI que no son parte de la sesión de auth
 * (separado de auth-store a propósito: esto sobrevive un logout).
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: 'isai-ui' },
  ),
);
