import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isFirebaseConfigured,
  listenToTenantCollection,
  upsertTenantRecord,
  updateTenantRecord,
} from '../services/firebase';
import { TenantContext } from '../services/recordMetadata';
import { TenantScopedRecord } from '../types';

type CollectionKey = Parameters<typeof listenToTenantCollection>[0];

export function useSyncedCollection<T extends { id: string }>(
  collectionName: CollectionKey,
  fallbackRecords: T[],
  syncEnabled = true,
  tenantContext?: TenantContext,
) {
  const [records, setRecords] = useState<T[]>(fallbackRecords);
  const [isLive, setIsLive] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const recordsRef = useRef(records);
  useEffect(() => { recordsRef.current = records; }, [records]);

  // Stable string key from tenant context — triggers re-subscription when parish changes.
  const contextKey = tenantContext
    ? `${tenantContext.tenantId}::${tenantContext.parishId}::${tenantContext.choirId}`
    : 'default';

  useEffect(() => {
    if (!isFirebaseConfigured || !syncEnabled) {
      setRecords(fallbackRecords);
      setIsLive(false);
      setSyncError(null);
      return;
    }
    // Flush stale parish data immediately so the UI never shows records from a
    // previous parish while the new subscription is still connecting.
    setRecords([]);
    setIsLive(false);

    const unsubscribe = listenToTenantCollection<T>(
      collectionName,
      (items) => { setRecords(items); setIsLive(true); setSyncError(null); },
      (error) => { setSyncError(error.message); setIsLive(false); },
      [],
      50,
      tenantContext,
    );
    return unsubscribe;
    // contextKey encodes all tenant fields; adding it here makes the effect
    // re-run whenever the user switches parish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, syncEnabled, contextKey]);

  // Insert or replace a record.
  const upsert = useCallback(
    async (record: T & Partial<TenantScopedRecord>, userId?: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = recordsRef.current;
      setRecords([record, ...prev.filter((item) => item.id !== record.id)]);
      if (isFirebaseConfigured && syncEnabled) {
        try {
          await upsertTenantRecord(collectionName, record, userId);
        } catch (err) {
          setRecords(prev);
          const msg = err instanceof Error ? err.message : 'Failed to save record.';
          setSyncError(msg);
          return { ok: false, error: msg };
        }
      }
      return { ok: true };
    },
    [collectionName, syncEnabled],
  );

  // Patch existing record fields.
  const patch = useCallback(
    async (recordId: string, patchData: Partial<T & TenantScopedRecord>, userId?: string): Promise<{ ok: boolean; error?: string }> => {
      const prev = recordsRef.current;
      setRecords(prev.map((item) => item.id === recordId ? { ...item, ...patchData } : item));
      if (isFirebaseConfigured && syncEnabled) {
        try {
          await updateTenantRecord(collectionName, recordId, patchData, userId);
        } catch (err) {
          setRecords(prev);
          const msg = err instanceof Error ? err.message : 'Failed to update record.';
          setSyncError(msg);
          return { ok: false, error: msg };
        }
      }
      return { ok: true };
    },
    [collectionName, syncEnabled],
  );

  const actions = useMemo(() => ({ upsert, patch }), [upsert, patch]);

  return { records, setRecords, isLive, syncError, actions };
}
