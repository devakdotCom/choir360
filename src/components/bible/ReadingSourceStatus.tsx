import React from 'react';
import { CheckCircle2, Clock3, RefreshCw, TriangleAlert } from 'lucide-react';
import { DailyReading } from '../../types';

interface ReadingSourceStatusProps {
  reading: DailyReading | null;
  isLoading: boolean;
  error?: string;
}

export const ReadingSourceStatus: React.FC<ReadingSourceStatusProps> = ({ reading, isLoading, error }) => {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Syncing source
      </span>
    );
  }

  if (error || reading?.syncStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
        <TriangleAlert className="h-3.5 w-3.5" />
        Sync needs retry
      </span>
    );
  }

  if (reading?.syncStatus === 'cached') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
        <Clock3 className="h-3.5 w-3.5" />
        Offline cache
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Source synced
    </span>
  );
};
