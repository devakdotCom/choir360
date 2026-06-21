import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Layers, Loader2, RefreshCw, RotateCcw, ScrollText } from 'lucide-react';
import { DailyReading, DailyReadingSection } from '../../types';
import { FALLBACK_DAILY_READING } from '../../data/dailyReadingsFallback';
import { ReadingDatePicker } from './ReadingDatePicker';
import { ReadingSourceStatus } from './ReadingSourceStatus';
import { apiFetch } from '../../services/apiClient';

const SOURCE_URL = 'https://www.arulvakku.com/calendar.php';

type SectionKey = 'firstReading' | 'psalm' | 'secondReading' | 'gospelAcclamation' | 'gospel';
type TabKey = SectionKey | 'all';

const TAB_DEFINITIONS: { key: TabKey; label: string; fallbackTitle: string }[] = [
  { key: 'firstReading', label: 'முதல் வாசகம்', fallbackTitle: 'முதல் வாசகம்' },
  { key: 'psalm', label: 'பதிலுரைப் பாடல்', fallbackTitle: 'பதிலுரைப் பாடல்' },
  { key: 'secondReading', label: 'இரண்டாம் வாசகம்', fallbackTitle: 'இரண்டாம் வாசகம்' },
  { key: 'gospelAcclamation', label: 'நற்செய்திக்கு முன் வாழ்த்தொலி', fallbackTitle: 'நற்செய்திக்கு முன் வசனம்' },
  { key: 'gospel', label: 'நற்செய்தி வாசகம்', fallbackTitle: 'நற்செய்தி வாசகம்' },
  { key: 'all', label: 'வாசகங்களின் தொடர்ச்சி', fallbackTitle: 'வாசகங்களின் தொடர்ச்சி' },
];

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function cacheKey(date: string, language: string) {
  return `choir360:dailyReadings:${date}:${language}`;
}

function readCachedReading(date: string, language: string): DailyReading | null {
  try {
    const cached = localStorage.getItem(cacheKey(date, language));
    return cached ? JSON.parse(cached) as DailyReading : null;
  } catch {
    return null;
  }
}

function getFallbackReading(date: string): DailyReading {
  return {
    ...FALLBACK_DAILY_READING,
    id: `${date}-ta-fallback`,
    date,
    syncStatus: 'cached',
  };
}

function writeCachedReading(reading: DailyReading) {
  try {
    localStorage.setItem(cacheKey(reading.date, reading.language), JSON.stringify(reading));
  } catch {
    // Cache is best-effort only.
  }
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();

  if (!contentType.includes('application/json')) {
    const looksLikeHtml = bodyText.trim().startsWith('<');
    throw new Error(
      looksLikeHtml
        ? 'Daily readings API is not available on this site. Deploy or run the backend route /api/bible/daily-readings.'
        : bodyText || 'Daily readings API returned an unsupported response.'
    );
  }

  try {
    return bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error('Daily readings API returned invalid JSON.');
  }
}

const SectionBlock: React.FC<{ section?: DailyReadingSection; fallbackTitle: string; showEmptyState?: boolean }> = ({
  section,
  fallbackTitle,
  showEmptyState,
}) => {
  const hasAnyContent = Boolean(section?.text || section?.reference);

  if (!hasAnyContent) {
    if (!showEmptyState) return null;
    return (
      <article className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{fallbackTitle}</p>
        <p className="mt-3 text-sm font-semibold text-slate-400">இன்று இந்த பகுதி இல்லை</p>
        <p className="mt-1 text-xs text-slate-400">No content available for this section today.</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{section?.heading || fallbackTitle}</p>
      {section?.reference && <p className="mt-2 text-sm font-bold text-slate-900">{section.reference}</p>}
      {section?.text && <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-slate-800">{section.text}</p>}
    </article>
  );
};

export const DailyReadingsCard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(todayInIndia());
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const loadReading = useCallback(async (date: string, forceRefresh = false) => {
    setIsLoading(true);
    setError('');

    const cached = readCachedReading(date, 'ta');
    if (cached && !forceRefresh) {
      setReading({ ...cached, syncStatus: cached.syncStatus === 'synced' ? 'cached' : cached.syncStatus });
    }

    try {
      const response = await apiFetch(`/api/bible/daily-readings?date=${encodeURIComponent(date)}&language=ta${forceRefresh ? '&refresh=1' : ''}`);
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload?.error || 'Daily readings could not be loaded.');
      }
      setReading(payload.reading);
      writeCachedReading(payload.reading);
    } catch (loadError) {
      const fallback = cached || readCachedReading(todayInIndia(), 'ta') || getFallbackReading(date);
      if (fallback) {
        setReading({
          ...fallback,
          syncStatus: 'cached',
          syncMessage: fallback.syncMessage || 'Showing offline cached readings.',
        });
        writeCachedReading(fallback);
      } else {
        setReading(null);
      }
      setError(loadError instanceof Error ? loadError.message : 'Daily readings could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReading(selectedDate);
  }, [loadReading, selectedDate]);

  useEffect(() => {
    setActiveTab('all');
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'full',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(`${selectedDate}T00:00:00+05:30`));
  }, [selectedDate]);

  const sectionHasContent = (section?: DailyReadingSection) => Boolean(section?.text || section?.reference);

  const hasContent = Boolean(
    sectionHasContent(reading?.firstReading) ||
    sectionHasContent(reading?.psalm) ||
    sectionHasContent(reading?.secondReading) ||
    sectionHasContent(reading?.gospelAcclamation) ||
    sectionHasContent(reading?.gospel)
  );

  // Always show every tab — including "all" — so the reading menu matches the
  // source site exactly. Tabs with no content for the date render a disabled
  // "no content" state instead of disappearing.
  const availableTabs = TAB_DEFINITIONS;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-[#f8faf9] p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#18392f] text-amber-300">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Today's Mass Readings</p>
            <h2 className="truncate text-xl font-black text-slate-950">இன்றைய திருப்பலி வாசகங்கள்</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">{reading?.sourceUrl || SOURCE_URL}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReadingSourceStatus reading={reading} isLoading={isLoading} error={reading ? '' : error} />
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Source
          </a>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReadingDatePicker value={selectedDate} onChange={setSelectedDate} disabled={isLoading} />
          <button
            type="button"
            onClick={() => void loadReading(selectedDate, true)}
            disabled={isLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#18392f] px-4 text-xs font-bold text-white disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-300" /> : <RefreshCw className="h-4 w-4 text-amber-300" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(todayInIndia())}
            disabled={isLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Today
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-4 sm:p-5">
        {isLoading && !reading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
              Loading readings...
            </div>
          </div>
        ) : error && !reading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-rose-200 bg-white p-8 text-center">
            <div>
              <BookOpen className="mx-auto h-10 w-10 text-rose-700" />
              <h3 className="mt-4 text-lg font-bold text-slate-900">Readings are unavailable</h3>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadReading(selectedDate, true)}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#18392f] px-4 text-xs font-bold text-white"
              >
                <RefreshCw className="h-4 w-4 text-amber-300" />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-4 lg:order-1">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{formattedDate}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">{reading?.title || 'திருப்பலி வாசகங்கள்'}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{reading?.liturgicalDay || 'Liturgical day not available'}</p>
                    {reading?.lastSyncedAt && (
                      <p className="mt-2 text-xs font-bold text-slate-400">Last synced: {reading.lastSyncedAt}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reading?.liturgicalColor && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800">
                        {reading.liturgicalColor}
                      </span>
                    )}
                    {reading?.feast && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-800">
                        {reading.feast}
                      </span>
                    )}
                  </div>
                </div>
                {reading?.syncMessage && <p className="mt-3 text-xs font-semibold text-amber-700">{reading.syncMessage}</p>}
                {error && reading && <p className="mt-3 text-xs font-semibold text-rose-700">{error}</p>}
              </div>

              {/* Mobile / tablet tab chips — same options as the desktop rail, just horizontal */}
              {hasContent && (
                <div
                  className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_proximity] lg:hidden"
                  role="tablist"
                  aria-label="Reading sections"
                >
                  {availableTabs.map((tab) => {
                    const tabHasContent = tab.key === 'all' || sectionHasContent(reading?.[tab.key]);
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-bold transition [scroll-snap-align:start] ${
                          activeTab === tab.key
                            ? 'bg-[#18392f] text-white'
                            : tabHasContent
                              ? 'border border-slate-200 bg-white text-slate-700'
                              : 'border border-slate-100 bg-white text-slate-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {hasContent ? (
                activeTab === 'all' ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SectionBlock section={reading?.firstReading} fallbackTitle="முதல் வாசகம்" />
                    <SectionBlock section={reading?.psalm} fallbackTitle="பதிலுரைப் பாடல்" />
                    <SectionBlock section={reading?.secondReading} fallbackTitle="இரண்டாம் வாசகம்" />
                    <SectionBlock section={reading?.gospelAcclamation} fallbackTitle="நற்செய்திக்கு முன் வசனம்" />
                    <div className="lg:col-span-2">
                      <SectionBlock section={reading?.gospel} fallbackTitle="நற்செய்தி வாசகம்" />
                    </div>
                    {reading?.reflection?.text && (
                      <div className="lg:col-span-2">
                        <SectionBlock section={reading.reflection} fallbackTitle="Reflection" />
                      </div>
                    )}
                  </div>
                ) : (
                  <SectionBlock
                    section={reading?.[activeTab]}
                    fallbackTitle={TAB_DEFINITIONS.find((t) => t.key === activeTab)?.fallbackTitle || ''}
                    showEmptyState
                  />
                )
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">No readings found for this date</h3>
                  <p className="mt-1 text-sm text-slate-500">Try refreshing from the source or select another date.</p>
                </div>
              )}
            </div>

            {/* Desktop right-side reading menu, matching arulvakku.com's "வாசகங்கள்" rail */}
            {hasContent && (
              <aside className="hidden lg:order-2 lg:block">
                <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    <Layers className="h-3.5 w-3.5" />
                    வாசகங்கள்
                  </p>
                  <nav className="flex flex-col gap-1" role="tablist" aria-label="Reading sections">
                    {availableTabs.map((tab) => {
                      const tabHasContent = tab.key === 'all' || sectionHasContent(reading?.[tab.key]);
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`rounded-lg px-3 py-2 text-left text-[13px] font-bold transition ${
                            activeTab === tab.key
                              ? 'bg-[#18392f] text-white'
                              : tabHasContent
                                ? 'text-slate-700 hover:bg-slate-50'
                                : 'text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
