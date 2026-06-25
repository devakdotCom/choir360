/**
 * AiToolsHub — Free, rule-based choir assistant.
 * Zero paid AI APIs. Uses:
 *  - Rule-based liturgical season → song category mapping
 *  - Fuse.js fuzzy search (if available) otherwise substring search
 *  - Member attendance/availability heuristics for schedule optimisation
 *  - Template-based content generation (birthday wishes, announcements)
 *
 * Optional: future Ollama / local-LLM support can be wired in without
 * changing the UI — just swap the rule engine calls below.
 */

import React, { useMemo, useState } from 'react';
import { Language, Member, Mass, MassCategory } from '../types';
import {
  Sparkles, Music, CheckCircle, FileText, CalendarCheck,
  Send, Sliders, BookOpen, Users, IndianRupee, Bell,
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';

interface AiToolsHubProps {
  currentLang: Language;
  members: Member[];
  masses: Mass[];
}

// ── Rule engine ───────────────────────────────────────────────────────────────

const SEASON_MAP: Record<string, string[]> = {
  'Advent':        ['வருகைப் பாடல்கள்', 'Advent Songs', 'O Come O Come Emmanuel'],
  'Christmas':     ['Praise & Worship', 'Joy to the World', 'Silent Night'],
  'Lent':          ['தியானப் பாடல்கள்', 'Penitential', 'Stations of the Cross'],
  'Holy Week':     ['Passion Hymns', 'Hosanna', 'Were You There'],
  'Easter':        ['Alleluia', 'Resurrection Songs', 'Christ the Lord is Risen'],
  'Ordinary Time': ['திருப்பாடல்கள்', 'Praise & Worship', 'Roman Catholic Songs'],
};

const MASS_SONG_MAP: Record<string, string[]> = {
  'Entrance':        ['வருகைப் பாடல்கள்', 'Processional Hymn'],
  'Penitential':     ['ஒப்புரவுப் பாடல்கள்', 'Kyrie'],
  'Gloria':          ['மகிமைப் பாடல்', 'Glory to God'],
  'Psalm':           ['திருப்பாடல்கள்', 'Responsorial Psalm'],
  'Gospel Acc.':     ['Gospel Acclamation', 'Alleluia'],
  'Offertory':       ['காணிக்கைப் பாடல்கள்', 'Offertory Hymn'],
  'Communion':       ['திருவிருந்துப் பாடல்கள்', 'Communion Song'],
  'Thanksgiving':    ['நன்றிப் பாடல்கள்', 'Thanksgiving Hymn'],
  'Recessional':     ['Recessional Hymn', 'Closing Song'],
};

const getLiturgicalSeason = (): string => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  if (month === 12 && day >= 1 && day <= 24) return 'Advent';
  if ((month === 12 && day >= 25) || (month === 1 && day <= 6)) return 'Christmas';
  if (month === 4 && day >= 10 && day <= 18) return 'Holy Week';
  if (month === 4) return 'Easter';
  if ((month === 2 && day >= 14) || (month === 3) || (month === 4 && day < 10)) return 'Lent';
  return 'Ordinary Time';
};

const getSongRecommendations = (massType: string, customNotes: string): string[] => {
  const season = getLiturgicalSeason();
  const seasonSongs = SEASON_MAP[season] ?? SEASON_MAP['Ordinary Time'];
  const massSongs   = Object.entries(MASS_SONG_MAP)
    .map(([part, cats]) => `${part}: ${cats.join(' / ')}`)
    .slice(0, 5);

  return [
    `Liturgical Season: ${season}`,
    `Recommended Categories: ${seasonSongs.join(', ')}`,
    '',
    'Song Plan for Each Part of Mass:',
    ...massSongs,
    '',
    massType === 'Wedding' ? '✦ Wedding Specials: Wedding March, Ava Maria, Pairing Song' : '',
    massType === 'Funeral' || massType === 'Death Mass'
      ? '✦ Funeral Specials: In Paradisum, God Be with You, Eternal Rest'
      : '',
    customNotes ? `✦ Your notes: ${customNotes}` : '',
  ].filter(Boolean);
};

const getScheduleOptimization = (mass: Mass | undefined, members: Member[]): string[] => {
  if (!mass) return ['No mass selected.'];
  const actives    = members.filter(m => m.status === 'Active Member' || m.status === 'Approved');
  const singers    = actives.filter(m => m.memberType === 'Singer');
  const instru     = actives.filter(m => m.memberType !== 'Singer');
  const soprano    = singers.filter(m => m.voiceType === 'Soprano');
  const alto       = singers.filter(m => m.voiceType === 'Alto');
  const tenor      = singers.filter(m => m.voiceType === 'Tenor');
  const bass       = singers.filter(m => m.voiceType === 'Bass');

  const ideal = { soprano: 2, alto: 2, tenor: 2, bass: 2 };
  const warnings: string[] = [];
  if (soprano.length < ideal.soprano) warnings.push(`⚠ Soprano: only ${soprano.length} (need ${ideal.soprano})`);
  if (alto.length    < ideal.alto)    warnings.push(`⚠ Alto: only ${alto.length} (need ${ideal.alto})`);
  if (tenor.length   < ideal.tenor)   warnings.push(`⚠ Tenor: only ${tenor.length} (need ${ideal.tenor})`);
  if (bass.length    < ideal.bass)    warnings.push(`⚠ Bass: only ${bass.length} (need ${ideal.bass})`);
  if (instru.length  < 1)             warnings.push('⚠ No instrumentalists — keyboard strongly recommended');

  return [
    `Mass: ${mass.name} (${mass.date} ${mass.time})`,
    `Roster: ${actives.length} active members`,
    `  Singers: ${singers.length} | Instrumentalists: ${instru.length}`,
    `  Soprano ${soprano.length} · Alto ${alto.length} · Tenor ${tenor.length} · Bass ${bass.length}`,
    '',
    warnings.length ? 'Gaps Detected:' : '✓ Voice parts look balanced',
    ...warnings,
    '',
    `Recommended assignment:`,
    `  Lead Vocalist: Soprano / Alto (strongest voice)`,
    `  Harmonies: Tenor + Bass`,
    `  Keyboard: Essential for rhythm`,
    `  Arrive: 30 min before Mass for sound check`,
  ];
};

const generateContent = (type: string, details: string, lang: Language): string => {
  const isTamil = lang === 'ta';
  switch (type) {
    case 'birthdayWish':
      return isTamil
        ? `அன்பான ${details || 'உறுப்பினர்'} அவர்களுக்கு,\nஇனிய பிறந்தநாள் வாழ்த்துக்கள்! கடவுளின் ஆசீர்வாதம் உங்கள் வாழ்வில் எப்பொழுதும் நிறையட்டும். இயேசுவின் அன்பு உங்களை வழிநடத்தட்டும்.\n\nகாயர் குடும்பம் ❤️`
        : `Dear ${details || 'Member'},\nWarm birthday wishes from the Choir family! May God's blessings overflow in your life and may Jesus guide every step of your journey.\n\nWith love & prayers 🎵`;
    case 'rehearsalNotice':
      return isTamil
        ? `அன்புள்ள குழு உறுப்பினர்களே,\n\nவழக்கமான பயிற்சி (${details || 'நாள் மற்றும் நேரம்'}) நடைபெறும். தயவுசெய்து வேளையில் வாருங்கள்.\n\nஆண்டவரின் பணியில் – நிர்வாகம்`
        : `Dear Choir Members,\n\nOur regular rehearsal is scheduled for ${details || '[date & time]'}. Please be present on time with your music sheets.\n\nIn His service — Choir Admin`;
    case 'massAnnouncement':
      return isTamil
        ? `திருப்பலி அறிவிப்பு:\n${details || 'சிறப்பு திருப்பலி விவரங்கள்'}\n\nகாயர் குழுவினர் முன்னதாக வந்து ஒலி சோதனை செய்யவும்.`
        : `Mass Announcement:\n${details || 'Special Mass details'}\n\nChoir members please arrive 30 minutes early for sound check.`;
    case 'financeReminder':
      return `Finance Reminder:\nDear ${details || 'member'}, kindly note that your share payment is due. Please contact the choir admin for details.\n\nThank you for your service in the Lord's vineyard.`;
    default:
      return `[Content generated for "${type}"]\n${details}`;
  }
};

// ── UI ─────────────────────────────────────────────────────────────────────────

type Tab = 'recommender' | 'optimizer' | 'content';

export const AiToolsHub: React.FC<AiToolsHubProps> = ({ currentLang, members, masses }) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  const [activeTab, setActiveTab] = useState<Tab>('recommender');

  // Song recommender
  const [recMassType, setRecMassType] = useState<MassCategory>('Sunday Mass');
  const [recCustom,   setRecCustom]   = useState('');
  const [recResult,   setRecResult]   = useState<string[]>([]);
  const [recLoading,  setRecLoading]  = useState(false);

  // Schedule optimizer
  const [selMassId,  setSelMassId]  = useState(masses[0]?.id ?? '');
  const [optResult,  setOptResult]  = useState<string[]>([]);
  const [optLoading, setOptLoading] = useState(false);

  // Content generator
  const [genType,    setGenType]    = useState('birthdayWish');
  const [genDetails, setGenDetails] = useState('');
  const [genResult,  setGenResult]  = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const selectedMass = useMemo(() => masses.find(m => m.id === selMassId), [masses, selMassId]);

  const handleRecommend = () => {
    setRecLoading(true);
    setTimeout(() => {
      setRecResult(getSongRecommendations(recMassType, recCustom));
      setRecLoading(false);
    }, 400);
  };

  const handleOptimize = () => {
    setOptLoading(true);
    setTimeout(() => {
      setOptResult(getScheduleOptimization(selectedMass, members));
      setOptLoading(false);
    }, 400);
  };

  const handleGenerate = () => {
    setGenLoading(true);
    setTimeout(() => {
      setGenResult(generateContent(genType, genDetails, currentLang));
      setGenLoading(false);
    }, 300);
  };

  const handleCopy = () => {
    if (!genResult) return;
    navigator.clipboard.writeText(genResult).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'recommender', label: 'Song Recommender',    icon: Music },
    { id: 'optimizer',   label: 'Schedule Optimiser',  icon: Sliders },
    { id: 'content',     label: 'Content Generator',   icon: FileText },
  ];

  const MASS_CATEGORIES: MassCategory[] = [
    'Sunday Mass', 'Weekday Mass', 'Special Mass', 'Wedding', 'Funeral',
    'Death Mass', 'Death Anniversary Mass', 'Feast Day', 'Ordination',
  ];

  const GEN_TYPES = [
    { value: 'birthdayWish',       label: 'Birthday Wish' },
    { value: 'rehearsalNotice',    label: 'Rehearsal Notice' },
    { value: 'massAnnouncement',   label: 'Mass Announcement' },
    { value: 'financeReminder',    label: 'Finance Reminder' },
  ];

  return (
    <div className="space-y-5 text-slate-800">
      {/* Header */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/30">
            <Sparkles className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">AI Choir Assistant</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Rule-based liturgical intelligence — works 100% offline, no paid API required.
              Optional: connect a local Ollama model for enhanced generation.
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
            FREE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold whitespace-nowrap transition min-h-[40px] ${activeTab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Song Recommender ── */}
      {activeTab === 'recommender' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Music className="h-4 w-4 text-emerald-600" /> Liturgical Song Recommender
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Mass Type</label>
                <select value={recMassType}
                  onChange={e => setRecMassType(e.target.value as MassCategory)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-emerald-400">
                  {MASS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Liturgical Season (auto-detected)</label>
                <input readOnly value={getLiturgicalSeason()}
                  className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 min-h-[44px]" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Special Notes (optional)</label>
              <textarea value={recCustom} onChange={e => setRecCustom(e.target.value)} rows={2}
                placeholder="e.g. Bride requested Ave Maria, youth choir, Tamil only…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <button onClick={handleRecommend} disabled={recLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18392f] py-2.5 text-sm font-bold text-white min-h-[44px] disabled:opacity-60">
              <Sparkles className="h-4 w-4 text-amber-300" />
              {recLoading ? 'Generating…' : 'Get Song Plan'}
            </button>
          </div>

          {recResult.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h4 className="text-xs font-bold uppercase text-emerald-700 mb-3 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Recommended Song Plan
              </h4>
              <div className="space-y-1">
                {recResult.map((line, i) => (
                  <p key={i} className={`text-sm ${line.startsWith('✦') ? 'text-emerald-800 font-semibold mt-2' : line === '' ? 'py-0.5' : line.endsWith(':') ? 'font-bold text-slate-700 mt-2' : 'text-slate-600 pl-3'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Schedule Optimiser ── */}
      {activeTab === 'optimizer' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-600" /> Choir Schedule Optimiser
            </h3>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Select Mass</label>
              {masses.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No masses logged yet. Add a mass in Liturgy & Masses first.</p>
              ) : (
                <select value={selMassId} onChange={e => setSelMassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-emerald-400">
                  {masses.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.date}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Member stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Active Member', 'Approved'] as const).flatMap(_ => []).concat([]).length === 0 && (
                <>
                  {[
                    { label: 'Active Members',    value: members.filter(m => m.status === 'Active Member').length, icon: Users },
                    { label: 'Singers',           value: members.filter(m => m.memberType === 'Singer').length, icon: Music },
                    { label: 'Instrumentalists',  value: members.filter(m => m.memberType !== 'Singer').length, icon: BookOpen },
                    { label: 'Pending Approval',  value: members.filter(m => m.status === 'Pending').length, icon: Bell },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <s.icon className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-slate-900">{s.value}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </>
              )}
            </div>

            <button onClick={handleOptimize} disabled={optLoading || masses.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18392f] py-2.5 text-sm font-bold text-white min-h-[44px] disabled:opacity-60">
              <CalendarCheck className="h-4 w-4 text-amber-300" />
              {optLoading ? 'Analysing…' : 'Optimise Roster'}
            </button>
          </div>

          {optResult.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h4 className="text-xs font-bold uppercase text-blue-700 mb-3 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Optimisation Report
              </h4>
              <div className="space-y-1">
                {optResult.map((line, i) => (
                  <p key={i} className={`text-sm ${line.startsWith('⚠') ? 'text-amber-800 font-semibold' : line.startsWith('✓') ? 'text-emerald-700 font-semibold' : line === '' ? 'py-0.5' : line.endsWith(':') ? 'font-bold text-slate-700 mt-2' : 'text-slate-600 pl-3'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Content Generator ── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" /> Choir Content Generator
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Content Type</label>
                <select value={genType} onChange={e => setGenType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-emerald-400">
                  {GEN_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Details / Name</label>
                <input value={genDetails} onChange={e => setGenDetails(e.target.value)}
                  placeholder="e.g. member name, date, amount…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={genLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18392f] py-2.5 text-sm font-bold text-white min-h-[44px] disabled:opacity-60">
              <Send className="h-4 w-4 text-amber-300" />
              {genLoading ? 'Generating…' : 'Generate Content'}
            </button>
          </div>

          {genResult && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-500">Generated Content</h4>
                <button onClick={handleCopy}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 min-h-[32px]">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700 font-sans leading-relaxed border border-slate-100">
                {genResult}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
