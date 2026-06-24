import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isFirebaseConfigured,
  listenToTenantCollection,
  upsertTenantRecord,
  updateTenantRecord,
} from '../services/firebase';
import { TenantScopedRecord } from '../types';

type CollectionKey = Parameters<typeof listenToTenantCollection>[0];

export function useSyncedCollection<T extends { id: string }>(
  collectionName: CollectionKey,
  fallbackRecords: T[],
  syncEnabled = true,
) {
  const [records, setRecords] = useState<T[]>(fallbackRecords);
  const [isLive, setIsLive] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const recordsRef = useRef(records);
  useEffect(() => { recordsRef.current = records; }, [records]);

  useEffect(() => {
    if (!isFirebaseConfigured || !syncEnabled) {
      setRecords(fallbackRecords);
      setIsLive(false);
      setSyncError(null);
      return;
    }
    const unsubscribe = listenToTenantCollection<T>(
      collectionName,
      (items) => { setRecords(items); setIsLive(true); setSyncError(null); },
      (error) => { setSyncError(error.message); setIsLive(false); },
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, syncEnabled]);

  // Insert or replace a record. Returns { ok: true } on success or
  // { ok: false, error } on Firestore rejection so callers can show the error.
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

  // Patch existing record fields. Returns { ok: true } on success or
  // { ok: false, error } on Firestore rejection.
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
