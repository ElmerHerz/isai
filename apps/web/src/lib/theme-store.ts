import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * useThemeStore — persistido, separado de auth-store (sobrevive un logout).
 * El valor inicial (antes de que el usuario elija algo explícito) respeta
 * la preferencia del sistema operativo/navegador.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'isai-theme' },
  ),
);

/** Para componentes que calculan colores en JS (ver lib/color.ts tintXxx) y
 * necesitan re-renderizar cuando el tema cambia, no solo leer la clase del
 * <html> una vez. */
export function useIsDarkMode() {
  return useThemeStore((state) => state.theme === 'dark');
}
