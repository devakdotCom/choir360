import React, { useState } from 'react';
import { Language, Member, Mass } from '../types';
import {
  Sparkles,
  Music,
  CheckCircle,
  AlertTriangle,
  FileText,
  CalendarCheck,
  Send,
  Sliders,
  Award,
  BookOpen,
  Volume2
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { apiFetch } from '../services/apiClient';

interface AiToolsHubProps {
  currentLang: Language;
  members: Member[];
  masses: Mass[];
}

export const AiToolsHub: React.FC<AiToolsHubProps> = ({
  currentLang,
  members,
  masses
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // Active AI service select
  const [activeService, setActiveService] = useState<'recommender' | 'optimizer' | 'content_gen'>('recommender');

  // --- 1. AI SONG RECOMMENDER STATE ---
  const [recMassType, setRecMassType] = useState('Marriage Mass');
  const [recSeason, setRecSeason] = useState('Ordinary Time');
  const [recLang, setRecLang] = useState('Tamil');
  const [recVocalStrength, setRecVocalStrength] = useState('balanced');
  const [recCustomPrompt, setRecCustomPrompt] = useState('');
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoData, setRecoData] = useState<any | null>(null);

  // --- 2. AI SCHEDULE OPTIMIZER STATE ---
  const [selectedMassId, setSelectedMassId] = useState(masses[0]?.id || '');
  const [optLoading, setOptLoading] = useState(false);
  const [optData, setOptData] = useState<any | null>(null);

  // --- 3. AI CONTENT GENERATOR STATE ---
  const [genType, setGenType] = useState('birthdayWish');
  const [genDetails, setGenDetails] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genData, setGenData] = useState<any | null>(null);


  // --- 1. Trigger AI Song Recommender ---
  const handleRecommendSongs = async () => {
    setRecoLoading(true);
    try {
      const response = await apiFetch("/api/gemini/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          massType: recMassType,
          season: recSeason,
          language: recLang,
          choirStrength: recVocalStrength,
          customPrompt: recCustomPrompt
        })
      });

      if (!response.ok) throw new Error();
      const resData = await response.json();
      setRecoData(resData);
    } catch {
      setRecoData({
        explanation: 'AI song recommendations are unavailable. Use the imported PDF Music Library to select exact songs.',
        recommendedSongs: [],
      });
    } finally {
      setRecoLoading(false);
    }
  };

  // --- 2. Trigger AI Schedule Optimizer ---
  const handleOptimizeSchedule = async () => {
    setOptLoading(true);
    const targetMass = masses.find(m => m.id === selectedMassId) || masses[0];
    
    try {
      const response = await apiFetch("/api/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members,
          massDetails: targetMass
        })
      });

      if (!response.ok) throw new Error();
      const resData = await response.json();
      setOptData(resData);
    } catch {
      setOptData({
        balanceScore: 0,
        evaluation: 'AI schedule optimization is unavailable. Add real members and masses, then retry when the AI service is connected.',
        vocalBalanceStatus: 'Unavailable',
        instrumentalStatus: 'Unavailable',
        structuralSuggestions: [],
        safetyAlerts: ['AI optimization service is unavailable.'],
      });
    } finally {
      setOptLoading(false);
    }
  };

  // --- 3. Trigger AI Content Generator ---
  const handleGenerateContent = async () => {
    setGenLoading(true);
    try {
      const response = await apiFetch("/api/gemini/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: genType,
          details: genDetails,
          language: currentLang
        })
      });

      if (!response.ok) throw new Error();
      const resData = await response.json();
      setGenData(resData);
    } catch {
      setGenData({
        subject: 'AI content generation unavailable',
        body: 'The AI content service is not available right now. Please retry after the server route is connected.',
        closing: '',
      });
    } finally {
      setGenLoading(false);
    }
  };


  return (
    <div className="space-y-8 animate-fade-in text-slate-800" id="ai-tools-hub-panel">
      {/* 1. Header Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="font-sans font-bold text-xl text-slate-850 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
            AI Liturgical Engineering Portal
          </h2>
          <p className="text-xs text-slate-500">Expert assistance powered by high-precision server-side Gemini 3.5 Models</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveService('recommender')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeService === 'recommender' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-ai-reco"
          >
            Song Recommender
          </button>
          <button
            onClick={() => setActiveService('optimizer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeService === 'optimizer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-ai-opt"
          >
            Schedule Optimizer
          </button>
          <button
            onClick={() => setActiveService('content_gen')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeService === 'content_gen' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-ai-gen"
          >
            Content Generator
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC WORKSPACE MODULE CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: PARAMETER SELECTION INPUTS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5" id="ai-parameters-panel">
          
          {/* SERVICE 1: SONG RECOMMENDER INPUTS */}
          {activeService === 'recommender' && (
            <div className="space-y-4 text-xs" id="recommender-inputs">
              <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <Music className="w-4 h-4 text-emerald-600" />
                Configure Rite Parameters
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mass Celebration Type</label>
                <select value={recMassType} onChange={e => setRecMassType(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200">
                  <option>Solemn Wedding Mass</option>
                  <option>Thanksgiving Feast Mass</option>
                  <option>Funeral Requiem Mass</option>
                  <option>First Holy Communion Mass</option>
                  <option>Confirmation Ceremony Mass</option>
                  <option>Ordinary Sunday Liturgy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Liturgical Calendar Season</label>
                <select value={recSeason} onChange={e => setRecSeason(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200">
                  <option>Ordinary Time (Liturgy: Green)</option>
                  <option>Advent (Liturgy: Violet Preparation)</option>
                  <option>Lent (Liturgy: Purple Penance)</option>
                  <option>Eastertide (Liturgy: White Feast)</option>
                  <option>Christmas (Liturgy: White Incarnation)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Principal Choral Language</label>
                <select value={recLang} onChange={e => setRecLang(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200">
                  <option>Tamil (Traditional & Devotional)</option>
                  <option>English</option>
                  <option>Malayalam</option>
                  <option>Telugu</option>
                  <option>Hindi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Vocal Roster Strength</label>
                <select value={recVocalStrength} onChange={e => setRecVocalStrength(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200">
                  <option value="balanced">Balanced Saturation (Default)</option>
                  <option value="soprano_heavy">Heavy Sopranos (melodic projection)</option>
                  <option value="bass_heavy">Deep Bass dominance (gregorian)</option>
                  <option value="instrumental_only">Acapella Choral Modes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Custom Theme / Secondary Saint</label>
                <textarea
                  value={recCustomPrompt}
                  onChange={e => setRecCustomPrompt(e.target.value)}
                  placeholder="e.g. Include traditional St. Cecilia hymns and focus on fast tempos."
                  className="w-full p-2.5 rounded-lg border border-slate-200 h-16"
                />
              </div>

              <button
                onClick={handleRecommendSongs}
                disabled={recoLoading}
                className="w-full py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
                id="recommend-btn-trigger"
              >
                <Sparkles className="w-4 h-4" />
                {recoLoading ? 'Recommending...' : 'Request AI Choral Plan'}
              </button>
            </div>
          )}

          {/* SERVICE 2: SCHEDULE OPTIMIZER INPUTS */}
          {activeService === 'optimizer' && (
            <div className="space-y-4 text-xs" id="optimizer-inputs">
              <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                Select Mass Calendar
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Target Roster Mass</label>
                <select
                  value={selectedMassId}
                  onChange={e => setSelectedMassId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                >
                  {masses.slice(0, 5).map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.date})</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans space-y-1">
                <p className="font-semibold text-slate-800 text-[10px]">What this optimizer does:</p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  It iterates over all approved members, analyzes their active weekend availability settings, and audits whether the Soprano/Alto/Tenor/Bass ratios can sustain traditional four-part choral hymns.
                </p>
              </div>

              <button
                onClick={handleOptimizeSchedule}
                disabled={optLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
                id="optimize-btn-trigger"
              >
                <Sparkles className="w-4 h-4" />
                {optLoading ? 'Analyzing...' : 'Audit Scheduled Roster'}
              </button>
            </div>
          )}

          {/* SERVICE 3: CONTENT GENERATOR INPUTS */}
          {activeService === 'content_gen' && (
            <div className="space-y-4 text-xs" id="content-gen-inputs">
              <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-emerald-600" />
                Bulletin Content parameters
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Communication Preset</label>
                <select value={genType} onChange={e => setGenType(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200">
                  <option value="birthdayWish">Personal Birthday Congratulations</option>
                  <option value="announcement">Parish Choral Announcement / Bulletin</option>
                  <option value="invitation">Mass practice rehearsal Invitation</option>
                  <option value="thankYou">Post Feast Patron Thank You message</option>
                  <option value="newsletter">Monthly Diocese Choral Circular</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Raw Details / Bullet points</label>
                <textarea
                  value={genDetails}
                  onChange={e => setGenDetails(e.target.value)}
                  placeholder="Enter the real member name, ministry context, date, and message details."
                  className="w-full p-2.5 rounded-lg border border-slate-200 h-28 font-sans"
                  required
                />
              </div>

              <button
                onClick={handleGenerateContent}
                disabled={genLoading}
                className="w-full py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
                id="content-gen-btn-trigger"
              >
                <Sparkles className="w-4 h-4" />
                {genLoading ? 'Composing...' : 'Compose Liturgical Copy'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI GENERATION RESPONSE CANVAS (GPAY, NOTION, APPLE STYLED) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl overflow-y-auto max-h-[580px] flex flex-col justify-between" id="ai-canvas-output">
          
          {/* STATIC PREVIEW BANNER */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4 gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">Response Canvas</span>
            </div>
            <span className="text-[10px] font-mono opacity-50 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              GEMINI-3.5-FLASH-ENGINE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin text-xs space-y-6" id="canvas-content-scroller">
            
            {/* SERVICE 1: RECOMMENDATIONS DISPLAY */}
            {activeService === 'recommender' && (
              <div className="space-y-5" id="recommender-response-view">
                {recoData ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Explanation */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed font-sans text-slate-300">
                      {recoData.explanation}
                    </div>

                    {/* Hymns listing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recoData.recommendedSongs?.map((rs: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 px-2 py-0.5 rounded uppercase font-mono">
                            {rs.type}
                          </span>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-emerald-400" />
                            {rs.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-sans leading-normal">{rs.liturgicalReasoning}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => alert("Choral roster updated: Song selections published to the upcoming mass rehearsal planner!")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition shadow"
                    >
                      Publish Songs to Rehearsal Planner
                    </button>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <Music className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs leading-normal">Select mass constraints and click <strong>"Request AI Choral Plan"</strong> above.</p>
                  </div>
                )}
              </div>
            )}

            {/* SERVICE 2: OPTIMIZER DISPLAY */}
            {activeService === 'optimizer' && (
              <div className="space-y-5" id="optimizer-response-view">
                {optData ? (
                  <div className="space-y-6 animate-fade-in text-xs font-sans">
                    {/* Score and evaluation */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-900 border border-slate-800 p-5 rounded-xl justify-between">
                      <div className="space-y-1.5 text-center sm:text-left">
                        <h4 className="font-sans font-bold text-sm text-white">Choral Roster Health Score</h4>
                        <p className="text-[10px] text-slate-400">{optData.evaluation}</p>
                      </div>
                      
                      <div className="text-center bg-emerald-950 border border-emerald-800 p-3 rounded-2xl w-24">
                        <p className="text-2xl font-extrabold text-white font-mono">{optData.balanceScore}%</p>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">Roster Score</p>
                      </div>
                    </div>

                    {/* Registrations audit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* vocal balance */}
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Vocal Harmony Audit</p>
                        <p className="text-xs text-white leading-relaxed">{optData.vocalBalanceStatus}</p>
                      </div>
                      
                      {/* instrumental status */}
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Instrumental Coverage</p>
                        <p className="text-xs text-white leading-relaxed">{optData.instrumentalStatus}</p>
                      </div>
                    </div>

                    {/* Alerts panel */}
                    {optData.safetyAlerts?.length > 0 && (
                      <div className="bg-rose-950/40 p-4 border border-rose-900/80 rounded-xl space-y-2">
                        <h5 className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rose-400" /> Critical Warnings
                        </h5>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200">
                          {optData.safetyAlerts.map((al: string, i: number) => <li key={i}>{al}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Sugg list */}
                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">AI Structural Suggestions</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {optData.structuralSuggestions?.map((sug: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-emerald-400 font-mono font-bold mt-0.5">#{idx + 1}</span>
                            <p className="text-[11px] text-slate-300 leading-normal">{sug}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <CalendarCheck className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs leading-normal">Choose mass calendar target and click <strong>"Audit Scheduled Roster"</strong> above.</p>
                  </div>
                )}
              </div>
            )}

            {/* SERVICE 3: CONTENT GEN DISPLAY */}
            {activeService === 'content_gen' && (
              <div className="space-y-5 animate-fade-in" id="content-gen-response-view">
                {genData ? (
                  <div className="space-y-4">
                    {/* Generated Mail template card */}
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 font-sans text-slate-300">
                      <div className="border-b border-slate-800 pb-3 space-y-1">
                        <span className="text-[9px] font-mono text-slate-500 block">SUBJECT LINE:</span>
                        <h4 className="text-xs font-bold text-white uppercase">{genData.subject}</h4>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-slate-500 block">BODY:</span>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{genData.body}</p>
                      </div>

                      <div className="border-t border-slate-800 pt-3 space-y-1">
                        <span className="text-[9px] font-mono text-slate-500 block">CLOSING SIGNATURE:</span>
                        <p className="text-xs font-bold text-emerald-400 italic font-mono">{genData.closing}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert("Copied liturgical copy successfully to clipboard!")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition shadow"
                    >
                      Copy Content to clipboard
                    </button>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <FileText className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs leading-normal">Select presets and click <strong>"Compose Liturgical Copy"</strong> above.</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer warning */}
          <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-500">
            <span>Liturgically secure • GDPR compliant data storage</span>
            <span>Zero Trust Authentication Active</span>
          </div>

        </div>
      </div>
    </div>
  );
};
