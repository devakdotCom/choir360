import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Church, MapPin, Search, X } from 'lucide-react';
import { activeParishes, ARCHDIOCESE_NAME, Parish } from '../../data/madrasMylaporeParishes';
import { useParish } from './ParishContext';

// =============================================================================
// Onboarding Modal — shown when no parish is selected yet
// =============================================================================
export const ParishOnboardingModal: React.FC = () => {
  const { needsParishSelection, selectParish } = useParish();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (needsParishSelection) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [needsParishSelection]);

  const parishes = useMemo(() => activeParishes(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parishes;
    return parishes.filter(
      (p) =>
        p.parishName.toLowerCase().includes(q) ||
        p.place.toLowerCase().includes(q) ||
        p.displayName.toLowerCase().includes(q),
    );
  }, [query, parishes]);

  if (!needsParishSelection) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#18392f] px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-[#18392f]">
              <Church className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                {ARCHDIOCESE_NAME}
              </p>
              <h2 className="text-lg font-bold leading-tight">Select your Parish</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-emerald-100/70">
            Choose your parish to personalise your choir management experience.
          </p>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by church name or place…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Parish list */}
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0 && (
            <li className="px-6 py-6 text-center text-sm text-slate-400">No parishes match "{query}"</li>
          )}
          {filtered.map((parish) => (
            <li key={parish.id}>
              <button
                type="button"
                onClick={() => selectParish(parish.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Church className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{parish.parishName}</p>
                  <p className="flex items-center gap-1 text-[10px] text-slate-500">
                    <MapPin className="h-3 w-3" /> {parish.place}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-center text-[10px] text-slate-400">{parishes.length} parishes · {ARCHDIOCESE_NAME}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Inline sidebar card for parish display + change
// =============================================================================
export const ParishSidebarCard: React.FC<{ songCount?: number; syncStatus: React.ReactNode }> = ({
  songCount,
  syncStatus,
}) => {
  const { selectedParish, needsParishSelection, clearParish, archdioceseName } = useParish();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const parishes = useMemo(() => activeParishes(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parishes;
    return parishes.filter(
      (p) =>
        p.parishName.toLowerCase().includes(q) ||
        p.place.toLowerCase().includes(q),
    );
  }, [query, parishes]);

  const { selectParish } = useParish();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleSelect = (parish: Parish) => {
    selectParish(parish.id);
    setDropdownOpen(false);
    setQuery('');
  };

  return (
    <div className="rounded-2xl bg-[#eef4f1] p-4 relative" ref={dropdownRef}>
      {/* Archdiocese label */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {archdioceseName}
      </p>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm shrink-0">
          <Church className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {needsParishSelection ? (
            <p className="text-sm font-bold text-slate-400">No parish selected</p>
          ) : (
            <>
              <p className="truncate text-sm font-bold text-slate-900">{selectedParish!.parishName}</p>
              <p className="flex items-center gap-1 text-[10px] text-slate-500">
                <MapPin className="h-3 w-3" /> {selectedParish!.place}
              </p>
              {songCount !== undefined && (
                <p className="text-[10px] text-slate-400 mt-0.5">Choir · {songCount} Songs</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Change Parish button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-white transition"
      >
        {needsParishSelection ? 'Select Parish' : 'Change Parish'}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Sync status */}
      <div className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[10px] font-semibold text-slate-500">
        {syncStatus}
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parish…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors ${selectedParish?.id === p.id ? 'bg-emerald-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{p.parishName}</p>
                    <p className="text-[10px] text-slate-500">{p.place}</p>
                  </div>
                  {selectedParish?.id === p.id && (
                    <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
