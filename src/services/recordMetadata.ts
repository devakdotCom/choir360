import { RecordStatus, TenantScopedRecord } from '../types';

const nowIso = () => new Date().toISOString();

export const DEFAULT_TENANT_CONTEXT = {
  tenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || 'global',
  parishId: import.meta.env.VITE_DEFAULT_PARISH_ID || 'st-thomas-cathedral',
  choirId: import.meta.env.VITE_DEFAULT_CHOIR_ID || 'st-thomas-cathedral-choir',
};

export function createRecordMetadata(
  userId = 'system',
  status: RecordStatus = 'active',
): TenantScopedRecord {
  const timestamp = nowIso();
  return {
    ...DEFAULT_TENANT_CONTEXT,
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
