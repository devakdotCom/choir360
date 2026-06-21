import React, { useState } from 'react';
import { BibleDocument } from '../types';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { BibleLanguageTabs, BibleSection } from './bible/BibleLanguageTabs';
import { BiblePdfViewer } from './bible/BiblePdfViewer';
import { DailyReadingsCard } from './bible/DailyReadingsCard';
import { DailyReadingsSyncPanel } from './bible/DailyReadingsSyncPanel';
import { ENGLISH_BIBLE_INDEX } from '../data/englishBibleIndex';

const bibleDocuments: Record<'ta' | 'en', BibleDocument> = {
  ta: {
    id: 'ta',
    label: 'Tamil Bible',
    tabLabel: 'Tamil Bible',
    title: 'திருவிவிலியம் பொது மொழிபெயர்ப்பு',
    subtitle: 'Loading Tamil Bible PDF...',
    pdfUrl: '/docs/tamil-bible-pothu-mozhipeyarppu.pdf',
    isAvailable: true,
  },
  en: {
    id: 'en',
    label: 'English Bible',
    tabLabel: 'English Bible',
    title: 'English Catholic Bible',
    subtitle: 'Loading English Bible PDF...',
    pdfUrl: '/docs/english-bible-catholic.pdf',
    isAvailable: true,
    chapterIndex: ENGLISH_BIBLE_INDEX,
  },
};

export const BibleViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<BibleSection>('ta');
  const { effectiveRole } = useFirebaseAuth();

  return (
    <div className="space-y-5 text-slate-800">
      <BibleLanguageTabs activeSection={activeSection} onSectionChange={setActiveSection} />

      {activeSection === 'readings' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <DailyReadingsCard />
          <DailyReadingsSyncPanel currentRole={effectiveRole} />
        </div>
      ) : (
        <BiblePdfViewer document={bibleDocuments[activeSection]} />
      )}
    </div>
  );
};
