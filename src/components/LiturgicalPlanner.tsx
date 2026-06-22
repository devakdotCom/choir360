import React, { useState } from 'react';
import { Sparkles, Music2, CalendarDays, BookOpen, ChevronRight, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { apiFetch } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SongSuggestion {
  position: string;  // e.g. "Entrance", "Offertory"
  tamilTitle: string;
  englishTitle: string;
  composer: string;
  rationale: string;
  liturgicalFit: 'Perfect' | 'Good' | 'Acceptable';
}

interface LiturgicalPlan {
  feast: string;
  date: string;
  season: string;
  vestmentColor: string;
  readings: { ref: string; theme: string }[];
  homilySuggestion: string;
  songs: SongSuggestion[];
  choirNotes: string;
}

// ─── Tamil Liturgical Data ────────────────────────────────────────────────────
const FEAST_OPTIONS = [
  { value: 'ordinary_sunday', label: 'Ordinary Sunday (Ordinary Time)' },
  { value: 'advent_sunday', label: 'Advent Sunday' },
  { value: 'christmas', label: 'Christmas — Nativity of the Lord' },
  { value: 'easter_sunday', label: 'Easter Sunday' },
  { value: 'good_friday', label: 'Good Friday' },
  { value: 'palm_sunday', label: 'Palm Sunday' },
  { value: 'ash_wednesday', label: 'Ash Wednesday' },
  { value: 'pentecost', label: 'Pentecost Sunday' },
  { value: 'assumption', label: 'Assumption of Mary (Aug 15)' },
  { value: 'all_saints', label: 'All Saints Day (Nov 1)' },
  { value: 'corpus_christi', label: 'Corpus Christi' },
  { value: 'divine_mercy', label: 'Divine Mercy Sunday' },
  { value: 'peter_paul', label: 'Sts. Peter & Paul (June 29)' },
  { value: 'john_baptist', label: 'Nativity of John the Baptist (June 24)' },
  { value: 'local_patron', label: 'Parish Patron Feast Day' },
  { value: 'wedding_mass', label: 'Wedding Mass' },
  { value: 'funeral_mass', label: 'Funeral Mass' },
];

// ─── Pre-computed Liturgical Plans (fallback when AI is unavailable) ──────────
const createFallbackPlan = (season: string, vestmentColor: string): Omit<LiturgicalPlan, 'feast' | 'date'> => ({
  season,
  vestmentColor,
  readings: [
    { ref: 'See Lectionary', theme: 'Use the appointed readings for this Mass.' },
  ],
  homilySuggestion: "Select music after reviewing the day's readings, feast, and parish context.",
  songs: [],
  choirNotes: 'Open Music Library and select exact songs from the imported PDF source.',
});

const BUILT_IN_PLANS: Record<string, Omit<LiturgicalPlan, 'feast' | 'date'>> = {
  ordinary_sunday: createFallbackPlan('Ordinary Time', 'Green'),
  advent_sunday: createFallbackPlan('Advent', 'Violet'),
  christmas: createFallbackPlan('Christmas', 'White'),
  easter_sunday: createFallbackPlan('Easter', 'White'),
  good_friday: createFallbackPlan('Easter Triduum', 'Red'),
  palm_sunday: createFallbackPlan('Lent', 'Red'),
  ash_wednesday: createFallbackPlan('Lent', 'Violet'),
  pentecost: createFallbackPlan('Pentecost', 'Red'),
  assumption: createFallbackPlan('Ordinary Time', 'White'),
  all_saints: createFallbackPlan('Ordinary Time', 'White'),
  corpus_christi: createFallbackPlan('Ordinary Time', 'White'),
  divine_mercy: createFallbackPlan('Easter', 'White'),
  peter_paul: createFallbackPlan('Ordinary Time', 'Red'),
  john_baptist: createFallbackPlan('Ordinary Time', 'White'),
  local_patron: createFallbackPlan('Ordinary Time', 'White'),
  wedding_mass: createFallbackPlan('Ordinary Time', 'White'),
  funeral_mass: createFallbackPlan('Ordinary Time', 'White'),
};

export const LiturgicalPlanner: React.FC = () => {
  const [feast, setFeast] = useState<string>('ordinary_sunday');
  const [customFeast, setCustomFeast] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LiturgicalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);

    // Try AI endpoint first; fall back to built-in plans
    try {
      const response = await apiFetch('/api/gemini/liturgical-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feast: customFeast || feast, date }),
      });
      if (response.ok) {
        const data = (await response.json()) as LiturgicalPlan;
        setPlan(data);
        setLoading(false);
        return;
      }
    } catch {
      // fallback below
    }

    // Built-in fallback
    await new Promise((r) => setTimeout(r, 800)); // simulate thinking
    const base = BUILT_IN_PLANS[feast] ?? BUILT_IN_PLANS['ordinary_sunday'];
    const feastLabel = FEAST_OPTIONS.find((f) => f.value === feast)?.label ?? (customFeast || feast);
    setPlan({ feast: feastLabel, date, ...base });
    setLoading(false);
  };

  const copyToClipboard = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const fitColor: Record<string, string> = {
    Perfect: 'bg-green-100 text-green-700',
    Good: 'bg-blue-100 text-blue-700',
    Acceptable: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30 p-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-violet-900 via-purple-800 to-indigo-900 p-6 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">AI Liturgical Planner</h1>
              <p className="text-xs text-violet-200">
                Auto-suggest Tamil Catholic songs for any Mass feast or season
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="mb-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-900">Plan a Mass</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Feast / Occasion</label>
              <select
                value={feast}
                onChange={(e) => setFeast(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 min-h-[44px] text-sm outline-none focus:border-violet-500"
              >
                {FEAST_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Custom Feast Name (optional — overrides above)
              </label>
              <input
                value={customFeast}
                onChange={(e) => setCustomFeast(e.target.value)}
                placeholder="e.g. Feast of St. Thomas (Patron of India)"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 min-h-[44px] text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Date of Mass</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 min-h-[44px] text-sm outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => void generatePlan()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 py-3 min-h-[44px] text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Liturgical Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Generated Plan */}
        {plan && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{plan.feast}</h2>
                  <p className="text-sm text-slate-600">
                    {plan.date} · {plan.season}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    plan.vestmentColor.includes('Green') ? 'border-green-600 bg-green-500'
                    : plan.vestmentColor.includes('White') ? 'border-slate-300 bg-white'
                    : plan.vestmentColor.includes('Red') ? 'border-red-600 bg-red-500'
                    : plan.vestmentColor.includes('Purple') ? 'border-purple-600 bg-purple-500'
                    : 'border-slate-400 bg-slate-100'
                  }`} />
                  <span className="text-xs font-bold text-slate-700">{plan.vestmentColor}</span>
                </div>
              </div>
            </div>

            {/* Readings */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-black text-slate-900">
                <BookOpen className="h-4 w-4 text-amber-600" />
                Scriptural Readings
              </h3>
              <div className="space-y-2">
                {plan.readings.map((r, i) => (
                  <div key={i} className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-black text-amber-800">{r.ref}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{r.theme}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-violet-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Homily Direction</p>
                <p className="mt-1 text-xs text-slate-700">{plan.homilySuggestion}</p>
              </div>
            </div>

            {/* Song Suggestions */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-black text-slate-900">
                <Music2 className="h-4 w-4 text-emerald-600" />
                Suggested Song Program
              </h3>
              <div className="space-y-3">
                {plan.songs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No song suggestions are prefilled. Select real songs from the imported PDF Music Library.
                  </div>
                )}
                {plan.songs.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          {s.position}
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-900">{s.tamilTitle}</p>
                        <p className="text-xs text-slate-600">{s.englishTitle}</p>
                        <p className="text-[11px] text-slate-500">by {s.composer}</p>
                        <p className="mt-1.5 text-xs text-slate-600">{s.rationale}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${fitColor[s.liturgicalFit]}`}>
                          {s.liturgicalFit}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(`${s.position}: ${s.tamilTitle} (${s.englishTitle}) by ${s.composer}`, i)
                          }
                          className="flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500"
                        >
                          {copiedIdx === i ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedIdx === i ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Choir Notes */}
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <h3 className="mb-2 flex items-center gap-2 font-black text-emerald-900">
                <CalendarDays className="h-4 w-4" />
                Choir Director Notes
              </h3>
              <p className="text-sm leading-relaxed text-emerald-800">{plan.choirNotes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
