import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth-store';
import { toast, getErrorMessage } from './toast';

// Extiende el config de axios para poder marcar requests puntuales que ya
// muestran su propio error inline (ej. login) y no necesitan el toast automático.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

/**
 * apiClient — Cliente HTTP centralizado para toda la app.
 *
 * Regla: Todos los módulos usan este cliente, nunca fetch/axios directo.
 * Base URL apunta al proxy de Vite en dev → NestJS en producción.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ─── Interceptor de Request: Inyecta JWT ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// El refresh token es de un solo uso (el backend lo rota y, si detecta que
// uno ya rotado se reutiliza, lo interpreta como robo y revoca TODA la
// familia de tokens del usuario — ver AuthService.refresh). React Query
// refetchea todas las queries activas al recuperar foco de ventana
// (default de la librería, no desactivado en main.tsx); si el access token
// ya expiró (15 min de inactividad), eso dispara varios 401 casi
// simultáneos. Sin este candado, cada uno llamaba /auth/refresh por su
// cuenta con el mismo refresh token: el primero lo rotaba con éxito, y el
// segundo (mismo token, ya usado) activaba la detección de robo y tumbaba
// la sesión entera — el bug real detrás de "después de un rato de
// inactividad hay que recargar la página". Un solo refresh en vuelo,
// compartido por todos los 401 concurrentes, lo evita de raíz.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

function refreshTokens(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', { refreshToken })
      .then((res) => res.data)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ─── Interceptor de Response: Maneja 401 (token expirado) + toast de error ─
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number; data?: { code?: string } };
      config?: { _retry?: boolean; skipErrorToast?: boolean } & Record<string, unknown>;
    };

    // El backend bloquea todo (salvo cambiar contraseña/perfil/logout) con
    // este código mientras mustChangePassword siga en true (ver
    // MustChangePasswordGuard) — se redirige en vez de mostrar el toast
    // genérico de "no tienes permiso". El guard de la propia ruta evita el
    // loop si ya estamos ahí.
    if (axiosError.response?.status === 403 && axiosError.response?.data?.code === 'MUST_CHANGE_PASSWORD') {
      if (window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
      return Promise.reject(error);
    }

    if (axiosError.response?.status === 401 && !axiosError.config?._retry) {
      const originalRequest = axiosError.config ?? {};
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const data = await refreshTokens(refreshToken);

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        originalRequest['headers'] = {
          ...(originalRequest['headers'] as Record<string, string> ?? {}),
          Authorization: `Bearer ${data.accessToken}`,
        };

        return apiClient(originalRequest as AxiosRequestConfig);
      } catch {
        // Refresh falló → la sesión ya no es recuperable. Un toast disparado
        // justo antes de `window.location.href` no alcanza a mostrarse (la
        // navegación completa descarta el documento actual) — se le avisa a
        // /login vía query param para que sea ESA página, ya cargada, la que
        // muestre el mensaje.
        useAuthStore.getState().logout();
        window.location.href = '/login?reason=expired';
        return Promise.reject(error);
      }
    }

    // Cualquier otro error (incluyendo un 401 sin refresh token disponible)
    // se avisa solo una vez, aquí, para toda la app — así ningún mutation
    // hook ni pantalla se queda sin feedback de error por olvido.
    if (!axiosError.config?.skipErrorToast) {
      toast.error(getErrorMessage(error));
    }

    return Promise.reject(error);
  },
);
