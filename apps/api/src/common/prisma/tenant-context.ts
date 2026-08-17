import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextStore {
  tenantId: string | null;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContextStore>();
