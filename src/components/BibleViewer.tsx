import React, { useState } from 'react';
import { BibleDocument } from '../types';
import { BibleLanguageTabs, BibleSection } from './bible/BibleLanguageTabs';
import { BiblePdfViewer } from './bible/BiblePdfViewer';
import { ENGLISH_BIBLE_INDEX } from '../data/englishBibleIndex';
import { TAMIL_BIBLE_INDEX } from '../data/tamilBibleIndex';

const bibleDocuments: Record<'ta' | 'en', BibleDocument> = {
  ta: {
    id: 'ta',
    label: 'Tamil Bible',
    tabLabel: 'Tamil Bible',
    title: 'திருவிவிலியம் பொது மொழிபெயர்ப்பு',
    subtitle: 'Loading Tamil Bible PDF...',
    pdfUrl: '/docs/tamil-bible-pothu-mozhipeyarppu.pdf',
    isAvailable: true,
    chapterIndex: TAMIL_BIBLE_INDEX,
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

// Today's Mass Readings used to have its own tab here, duplicating the same
// live-synced card now shown in Catholic Hub's "Daily Gospel" tab. Removed to
// avoid two disconnected copies of the same content drifting out of sync —
// it now lives in exactly one place.
export const BibleViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<BibleSection>('ta');

  return (
    <div className="space-y-5 text-slate-800">
      <BibleLanguageTabs activeSection={activeSection} onSectionChange={setActiveSection} />
      <BiblePdfViewer document={bibleDocuments[activeSection]} />
    </div>
  );
};
