import React from 'react';
import { CalendarDays } from 'lucide-react';

interface ReadingDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ReadingDatePicker: React.FC<ReadingDatePickerProps> = ({ value, onChange, disabled }) => (
  <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
    <CalendarDays className="h-4 w-4 text-emerald-800" />
    <span className="sr-only">Select readings date</span>
    <input
      type="date"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 bg-transparent text-sm font-bold outline-none disabled:opacity-50"
      aria-label="Select readings date"
    />
  </label>
);
