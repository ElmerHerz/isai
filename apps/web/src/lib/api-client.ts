import axios from 'axios';
import { useAuthStore } from './auth-store';

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

// ─── Interceptor de Response: Maneja 401 (token expirado) ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number };
      config?: { _retry?: boolean } & Record<string, unknown>;
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

        return apiClient(originalRequest as Parameters<typeof apiClient>[0]);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
