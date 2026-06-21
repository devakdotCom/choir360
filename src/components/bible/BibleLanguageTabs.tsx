import React from 'react';
import { BookOpen, CalendarDays, Languages } from 'lucide-react';

export type BibleSection = 'ta' | 'en' | 'readings';

interface BibleLanguageTabsProps {
  activeSection: BibleSection;
  onSectionChange: (section: BibleSection) => void;
}

const tabs: { id: BibleSection; label: string; description: string; Icon: React.ElementType }[] = [
  { id: 'ta', label: 'Tamil Bible', description: 'திருவிவிலியம்', Icon: BookOpen },
  { id: 'en', label: 'English Bible', description: 'Roman Catholic PDF', Icon: Languages },
  { id: 'readings', label: 'இன்றைய திருப்பலி வாசகங்கள்', description: "Today's Mass Readings", Icon: CalendarDays },
];

export const BibleLanguageTabs: React.FC<BibleLanguageTabsProps> = ({ activeSection, onSectionChange }) => (
  <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-3">
    {tabs.map(({ id, label, description, Icon }) => {
      const active = activeSection === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSectionChange(id)}
          className={
            'flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-2 text-left transition ' +
            (active ? 'bg-[#18392f] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
          }
          aria-current={active ? 'page' : undefined}
        >
          <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (active ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-emerald-800')}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{label}</span>
            <span className={'mt-0.5 block truncate text-[11px] font-semibold ' + (active ? 'text-emerald-100' : 'text-slate-400')}>
              {description}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
