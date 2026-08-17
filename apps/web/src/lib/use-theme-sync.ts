import { useEffect } from 'react';
import { useThemeStore } from './theme-store';

/**
 * useThemeSync — aplica/quita la clase "dark" en <html> según el store.
 * Tailwind (darkMode: ['class']) lee esa clase para activar los tokens
 * .dark de index.css. Se llama una sola vez, en __root.tsx.
 */
export function useThemeSync() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
