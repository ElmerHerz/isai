import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useThemeStore } from '@/lib/theme-store';
import { useThemeSync } from '@/lib/use-theme-sync';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  useThemeSync();
  const theme = useThemeStore((state) => state.theme);

  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" closeButton theme={theme} duration={4000} />
    </>
  );
}
