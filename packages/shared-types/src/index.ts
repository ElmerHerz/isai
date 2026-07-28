/**
 * @isai/shared-types
 *
 * Fuente de verdad única para tipos compartidos entre API (backend) y Web (frontend).
 *
 * Regla: Si defines un tipo en el frontend sin haberlo tomado de aquí, es un bug de proceso.
 * Todo tipo que cruce el límite API ↔ Web debe vivir aquí.
 *
 * Alineado contra el schema real de isai_desa (no contra el diseño de texto original).
 */

// ─── General ────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  currencyCode: string;
  countryCode: string;
  languageCode: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Institution {
  id: string;
  tenantId: string;
  typeCode: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Branch {
  id: string;
  institutionId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Module {
  code: string;
  name: string;
  description?: string | null;
  isCore: boolean;
}

// ─── Security ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string | null; // null = superadmin de la plataforma
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  locale: string;
  timezone: string;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  tenantId: string | null; // null = rol de sistema (superadmin, admin)
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Permission {
  id: string;
  moduleCode: string;
  /** Formato: modulo.recurso.accion (ej: finance.invoice.create) */
  code: string;
  name: string;
  description?: string | null;
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
  tenantId: string | null; // null = superadmin de la plataforma
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
