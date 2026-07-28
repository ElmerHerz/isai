/**
 * @isai/shared-types
 *
 * Fuente de verdad única para tipos compartidos entre API (backend) y Web (frontend).
 *
 * Regla: Si defines un tipo en el frontend sin haberlo tomado de aquí, es un bug de proceso.
 * Todo tipo que cruce el límite API ↔ Web debe vivir aquí.
 */

// ─── General ────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface Institution {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  institutionId: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// ─── Security ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  moduleId: string;
  /** Formato: modulo.recurso.accion (ej: finance.invoice.create) */
  code: string;
  name: string;
  description?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  permissions: string[];
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Respuesta de error estándar de la API */
export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

/** Lista paginada estándar */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
