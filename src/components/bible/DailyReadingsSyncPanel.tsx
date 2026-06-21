import React, { useState } from 'react';
import { Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { DailyReading, Role } from '../../types';
import { hasMinimumRole } from '../../hooks/useFirebaseAuth';
import { apiFetch } from '../../services/apiClient';
import { ReadingDatePicker } from './ReadingDatePicker';

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

interface DailyReadingsSyncPanelProps {
  currentRole: Role;
}

export const DailyReadingsSyncPanel: React.FC<DailyReadingsSyncPanelProps> = ({ currentRole }) => {
  const [selectedDate, setSelectedDate] = useState(todayInIndia());
  const [publicDisplay, setPublicDisplay] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState('');
  const isAdmin = hasMinimumRole(currentRole, 'choir_admin');

  const syncDate = async (date: string) => {
    setIsSyncing(true);
    setStatus('');
    try {
      const response = await apiFetch('/api/bible/daily-readings/sync', {
        method: 'POST',
        body: JSON.stringify({ date, language: 'ta', publicDisplay }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Sync failed.');
      const reading = payload.reading as DailyReading;
      setStatus(`Synced ${reading.date} at ${new Date(reading.lastSyncedAt || Date.now()).toLocaleString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAdmin) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Admin sync control</p>
            <p className="text-xs font-semibold text-slate-500">Visible to choir admins and above.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">Admin sync control</p>
          <p className="text-xs font-semibold text-slate-500">Source: https://www.arulvakku.com/calendar.php</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <ReadingDatePicker value={selectedDate} onChange={setSelectedDate} disabled={isSyncing} />
        <button
          type="button"
          onClick={() => void syncDate(todayInIndia())}
          disabled={isSyncing}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 disabled:opacity-40"
        >
          <RefreshCw className={'h-4 w-4 ' + (isSyncing ? 'animate-spin' : '')} />
          Sync today
        </button>
        <button
          type="button"
          onClick={() => void syncDate(selectedDate)}
          disabled={isSyncing}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#18392f] px-4 text-xs font-bold text-white disabled:opacity-40"
        >
          <RefreshCw className={'h-4 w-4 text-amber-300 ' + (isSyncing ? 'animate-spin' : '')} />
          Sync date
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
        <input
          type="checkbox"
          checked={publicDisplay}
          onChange={(event) => setPublicDisplay(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-800"
        />
        Enable public display after sync
      </label>

      {status && (
        <p className={'mt-3 text-xs font-bold ' + (status.toLowerCase().includes('failed') || status.toLowerCase().includes('missing') ? 'text-rose-700' : 'text-emerald-800')}>
          {status}
        </p>
      )}
    </aside>
  );
};
