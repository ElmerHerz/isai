import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@isai/shared-types';

/**
 * AuthStore — Estado global de autenticación.
 *
 * Almacena: usuario, tenant activo, sucursal activa, tokens JWT.
 * Persistido en localStorage para sobrevivir recargas de página.
 *
 * Regla: El tenantId NUNCA se coloca manualmente aquí desde el frontend.
 * Siempre viene del JWT decodificado que devuelve el backend.
 */
interface AuthState {
  // Datos del usuario autenticado
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Contexto de trabajo (tenant / sucursal activa)
  activeTenantId: string | null;
  activeBranchId: string | null;

  // Acciones
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setActiveBranch: (branchId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeTenantId: null,
      activeBranchId: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) =>
        set({
          user,
          activeTenantId: user.tenantId,
        }),

      setActiveBranch: (branchId) =>
        set({ activeBranchId: branchId }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeTenantId: null,
          activeBranchId: null,
        }),

      // "Autenticado" = tiene un token. El perfil (user) se carga aparte
      // vía /auth/me una vez ya estás dentro — no lo exigimos aquí porque
      // el guard de ruta corre justo después del login, antes de que
      // /auth/me haya tenido tiempo de resolver.
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'isai-auth',
      // Solo persiste tokens y contexto, no el objeto user completo
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeTenantId: state.activeTenantId,
        activeBranchId: state.activeBranchId,
      }),
    },
  ),
);
