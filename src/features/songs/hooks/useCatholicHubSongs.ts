/**
 * useCatholicHubSongs
 *
 * Reads Catholic Tamil songs directly from Firestore.
 * Never triggers a source-page scrape on its own — that is the backend's
 * responsibility (monthly scheduled sync or admin manual sync).
 *
 * Consumers call `refresh()` to re-read the Firestore cache; they call the
 * admin API (`/api/catholic-hub/songs/sync`) to actually scrape new content.
 */
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';

// ── Public types ─────────────────────────────────────────────────────────────

export interface CatholicHubSong {
  id: string;
  title: string;
  titleNormalized?: string;
  /** categoryId string, e.g. 'varugai' */
  category: string;
  categoryTamil: string;
  lyrics: string;
  lyricsNormalized?: string;
  /** Individual song page URL on radio.catholictamil.com */
  sourceUrl: string;
  /** Category listing page URL */
  sourcePageUrl?: string;
  /** Legacy field — same as sourcePageUrl */
  sourcePage?: string;
  order: number;
  tags: string[];
  /** SHA-256 (first 16 chars) of title + lyrics — used for change detection */
  contentHash?: string;
  isArchived?: boolean;
  /** ISO timestamp of when the song was last seen on the source page */
  lastSourceSeenAt?: string;
  lastSyncedAt?: string;
}

export interface CatholicHubSongSyncStatus {
  categoryId: string;
  categoryTamil: string;
  sourceUrl: string;
  status?: 'idle' | 'syncing' | 'success' | 'failed';
  lastSyncedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  errorMessage?: string;
  /** New detailed counts */
  totalFetched?: number;
  totalCreated?: number;
  totalUpdated?: number;
  totalUnchanged?: number;
  totalArchived?: number;
  /** Legacy field kept for backward compat */
  totalSongsSynced?: number;
  syncDurationMs?: number;
  nextScheduledSyncAt?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCatholicHubSongsResult {
  songs: CatholicHubSong[];
  syncStatuses: CatholicHubSongSyncStatus[];
  loading: boolean;
  error: string;
  /** ISO timestamp of last Firestore read */
  lastLoadedAt: string;
  /** Re-read songs and sync statuses from Firestore */
  refresh: () => Promise<void>;
}

export function useCatholicHubSongs(): UseCatholicHubSongsResult {
  const [songs, setSongs] = useState<CatholicHubSong[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<CatholicHubSongSyncStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');

  const refresh = useCallback(async () => {
    if (!db) {
      // Firebase not configured — not an error, just no data
      setError('');
      setSongs([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Load all active (non-archived) songs — category filtering is client-side
      const songsSnap = await getDocs(
        query(
          collection(db, 'catholicHubSongs'),
          where('status', '==', 'active'),
          limit(1500),
        ),
      );

      const loaded = songsSnap.docs.map((d) => {
        const data = d.data() as CatholicHubSong;
        return {
          ...data,
          // Normalise legacy sourcePage → sourcePageUrl
          sourcePageUrl: data.sourcePageUrl ?? data.sourcePage,
        };
      });

      // Sort: by category then by order within category
      loaded.sort((a, b) => {
        const cat = (a.category ?? '').localeCompare(b.category ?? '');
        return cat !== 0 ? cat : (a.order ?? 0) - (b.order ?? 0);
      });

      setSongs(loaded);
      setLastLoadedAt(new Date().toISOString());

      // Load sync statuses (small collection, always read in full)
      const statusSnap = await getDocs(collection(db, 'catholicHubSongSyncStatus'));
      setSyncStatuses(statusSnap.docs.map((d) => d.data() as CatholicHubSongSyncStatus));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load songs from cache.';
      // Surface only non-permission errors to the user
      if (msg.includes('Missing or insufficient permissions')) {
        // Silently ignore — happens before first sync when collection doesn't exist
        setSongs([]);
      } else {
        setError('Songs could not be loaded. Please try refreshing.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { songs, syncStatuses, loading, error, lastLoadedAt, refresh };
}
