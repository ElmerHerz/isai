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

// ─── Interceptor de Response: Maneja 401 (token expirado) + toast de error ─
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number };
      config?: { _retry?: boolean; skipErrorToast?: boolean } & Record<string, unknown>;
    };

    if (axiosError.response?.status === 401 && !axiosError.config?._retry) {
      const originalRequest = axiosError.config ?? {};
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>('/api/v1/auth/refresh', { refreshToken });

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        originalRequest['headers'] = {
          ...(originalRequest['headers'] as Record<string, string> ?? {}),
          Authorization: `Bearer ${data.accessToken}`,
        };

        return apiClient(originalRequest as AxiosRequestConfig);
      } catch {
        // Refresh falló → se está redirigiendo a /login, un toast justo
        // antes no sirve de nada.
        useAuthStore.getState().logout();
        window.location.href = '/login';
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
