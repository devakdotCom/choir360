import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Parish, findParishById, ARCHDIOCESE_ID, ARCHDIOCESE_NAME } from '../../data/madrasMylaporeParishes';

const STORAGE_KEY = 'choir360_selected_parish_id';

// =============================================================================
// Context shape
// =============================================================================
interface ParishContextValue {
  /** Currently selected parish (null = not yet chosen) */
  selectedParish: Parish | null;
  /** True if the user has not yet selected a parish */
  needsParishSelection: boolean;
  /** Call to change the parish */
  selectParish: (parishId: string) => void;
  /** Clear selection (e.g. "change parish" button) */
  clearParish: () => void;
  archdioceseId: string;
  archdioceseName: string;
}

const ParishContext = createContext<ParishContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================
export const ParishProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedParishId, setSelectedParishId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const selectedParish = useMemo(
    () => (selectedParishId ? (findParishById(selectedParishId) ?? null) : null),
    [selectedParishId],
  );

  const selectParish = useCallback((parishId: string) => {
    setSelectedParishId(parishId);
    try {
      localStorage.setItem(STORAGE_KEY, parishId);
    } catch { /* storage blocked */ }
  }, []);

  const clearParish = useCallback(() => {
    setSelectedParishId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage blocked */ }
  }, []);

  const value = useMemo<ParishContextValue>(
    () => ({
      selectedParish,
      needsParishSelection: selectedParish === null,
      selectParish,
      clearParish,
      archdioceseId: ARCHDIOCESE_ID,
      archdioceseName: ARCHDIOCESE_NAME,
    }),
    [selectedParish, selectParish, clearParish],
  );

  return <ParishContext.Provider value={value}>{children}</ParishContext.Provider>;
};

// =============================================================================
// Hook
// =============================================================================
export const useParish = (): ParishContextValue => {
  const ctx = useContext(ParishContext);
  if (!ctx) throw new Error('useParish must be used inside <ParishProvider>');
  return ctx;
};
