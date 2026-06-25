import { RecordStatus, TenantScopedRecord } from '../types';

const nowIso = () => new Date().toISOString();

// =============================================================================
// Tenant context — resolved at runtime so every write carries the correct
// parishId from the selected parish (not a hardcoded default).
// =============================================================================
export interface TenantContext {
  tenantId: string;
  parishId: string;
  choirId: string;
}

/**
 * Env-var fallback used when no parish has been selected yet (first-launch).
 * Once the user selects a parish, pass its TenantContext explicitly to all
 * write helpers so records land in the correct parish bucket.
 */
export const DEFAULT_TENANT_CONTEXT: TenantContext = {
  tenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || 'global',
  parishId: import.meta.env.VITE_DEFAULT_PARISH_ID || 'global',
  choirId: import.meta.env.VITE_DEFAULT_CHOIR_ID || 'global-choir',
};

export function createRecordMetadata(
  userId = 'system',
  status: RecordStatus = 'active',
  context: TenantContext = DEFAULT_TENANT_CONTEXT,
): TenantScopedRecord {
  const timestamp = nowIso();
  return {
    ...context,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId,
    updatedBy: userId,
    status,
    deletedAt: null,
    deletedBy: null,
  };
}

export function updateRecordMetadata<T extends Partial<TenantScopedRecord>>(
  record: T,
  userId = 'system',
): T & Pick<TenantScopedRecord, 'updatedAt' | 'updatedBy'> {
  return {
    ...record,
    updatedAt: nowIso(),
    updatedBy: userId,
  };
}

export function softDeleteRecord<T extends Partial<TenantScopedRecord>>(
  record: T,
  userId = 'system',
) {
  const timestamp = nowIso();
  return {
    ...record,
    status: 'deleted' as const,
    updatedAt: timestamp,
    updatedBy: userId,
    deletedAt: timestamp,
    deletedBy: userId,
  };
}
