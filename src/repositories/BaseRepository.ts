/**
 * BaseRepository – thin typed wrapper over Firebase service functions.
 * All Firestore access in the application flows through repositories.
 * Components and hooks never call Firebase SDK functions directly.
 */
import {
  listenToTenantCollection,
  upsertTenantRecord,
  updateTenantRecord,
  batchUpsertTenantRecords,
} from '../services/firebase';
import type { TenantScopedRecord } from '../types';

type CollectionKey = Parameters<typeof listenToTenantCollection>[0];

export interface Repository<T extends { id: string }> {
  listen(
    onChange: (items: T[]) => void,
    onError?: (err: Error) => void,
  ): () => void;
  upsert(record: T & Partial<TenantScopedRecord>, userId?: string): Promise<void>;
  patch(id: string, patch: Partial<T & TenantScopedRecord>, userId?: string): Promise<void>;
  batchUpsert(records: Array<T & Partial<TenantScopedRecord>>, userId?: string): Promise<void>;
}

export function createRepository<T extends { id: string }>(
  collectionName: CollectionKey,
): Repository<T> {
  return {
    listen(onChange, onError) {
      return listenToTenantCollection<T>(collectionName, onChange, onError);
    },
    upsert(record, userId) {
      return upsertTenantRecord(collectionName, record, userId);
    },
    patch(id, patch, userId) {
      return updateTenantRecord(collectionName, id, patch, userId);
    },
    batchUpsert(records, userId) {
      return batchUpsertTenantRecords(collectionName, records, userId);
    },
  };
}
