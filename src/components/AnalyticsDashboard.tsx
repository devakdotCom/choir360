import React from 'react';
import { Member, Mass, Payment, Language } from '../types';
import {
  Activity,
  BarChart2,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';

interface AnalyticsDashboardProps {
  currentLang: Language;
  members: Member[];
  masses: Mass[];
  payments: Payment[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentLang,
  members,
  masses,
  payments
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // Filter out registered statuses
  const activeMembers = members.filter(m => m.status === 'Active Member');
  const pendingApplicants = members.filter(m => m.status === 'Pending').length;

  // Vocals breakdown counts
  const sopranos = activeMembers.filter(m => m.voiceType === 'Soprano').length;
  const altos = activeMembers.filter(m => m.voiceType === 'Alto').length;
  const tenors = activeMembers.filter(m => m.voiceType === 'Tenor').length;
  const basses = activeMembers.filter(m => m.voiceType === 'Bass').length;
  const instrumentalists = activeMembers.filter(m => m.memberType !== 'Singer').length;

  const totalSopranoPercent = Math.round((sopranos / (activeMembers.length || 1)) * 100);
  const totalAltoPercent = Math.round((altos / (activeMembers.length || 1)) * 100);
  const totalTenorPercent = Math.round((tenors / (activeMembers.length || 1)) * 100);
  const totalBassPercent = Math.round((basses / (activeMembers.length || 1)) * 100);

  // Financial aggregates
  const totalReceivedOfferings = payments
    .filter(p => p.status === 'Received')
    .reduce((acc, curr) => acc + curr.promisedAmount, 0);

  const totalOutstandingAdues = payments
    .filter(p => p.status === 'Pending')
    .reduce((acc, curr) => acc + curr.pendingAmount, 0);

  return (
    <div className="space-y-8 text-slate-850 animate-fade-in" id="analytics-dashboard-panel">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="font-sans font-bold text-xl text-slate-800 flex items-center gap-1.5">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            Parish Choral & Finance Analytics
          </h2>
          <p className="text-xs text-slate-505">Diocesan audits, vocal register saturation, and fund splits ledgers</p>
        </div>
        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold text-xs text-emerald-800">
          Data audit mode: REAL TIME
        </div>
      </div>

      {/* 2. Top level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-1.5 flex flex-col justify-between shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Active Choralists</p>
          <p className="text-2xl font-extrabold text-slate-800 font-mono">{activeMembers.length}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">{pendingApplicants} Pending applications</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-1.5 flex flex-col justify-between shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Offerings</p>
          <p className="text-2xl font-extrabold text-slate-800 font-mono">₹{totalReceivedOfferings.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Cleared via parish council</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-1.5 flex flex-col justify-between shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Adues Outstanding</p>
          <p className="text-2xl font-extrabold text-rose-600 font-mono">₹{totalOutstandingAdues.toLocaleString()}</p>
          <p className="text-[10px] text-rose-500 font-semibold">Pending invoice followups</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-1.5 flex flex-col justify-between shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Liturgical Services Log</p>
          <p className="text-2xl font-extrabold text-slate-800 font-mono">{masses.length}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">100% Ordinary & holiday season rites</p>
        </div>
      </div>

      {/* 3. Graphical representations bars & voice balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="graphics-panel">
        
        {/* VOICE HARMONY CHART MODULE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5" id="vocals-balance-analytics-card">
          <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-emerald-600" />
            Four-Part Harmony Saturation
          </h3>

          <div className="space-y-4">
            {/* Sopranos */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-bold">Soprano (Melodic Alto High)</span>
                <span className="font-mono">{sopranos} Singer(s) ({totalSopranoPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-emerald-600 h-3 rounded-full" style={{ width: `${totalSopranoPercent}%` }} />
              </div>
            </div>

            {/* Altos */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-bold">Alto (Harmonic Mid Range)</span>
                <span className="font-mono">{altos} Singer(s) ({totalAltoPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${totalAltoPercent}%` }} />
              </div>
            </div>

            {/* Tenors */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-bold">Tenor (Male Strong Lead)</span>
                <span className="font-mono">{tenors} Singer(s) ({totalTenorPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${totalTenorPercent}%` }} />
              </div>
            </div>

            {/* Basses */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-bold">Bass (Traditional Resonant Base)</span>
                <span className="font-mono">{basses} Singer(s) ({totalBassPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${totalBassPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[10px] text-slate-500 leading-relaxed font-sans">
            <strong>Optimal Vocal Ratios:</strong> Standard roman traditional Catholic choral models require Soprano (40%), Alto (30%), Tenor (15%), and Bass (15%) for balanced four-part acoustic penetration.
          </div>
        </div>

        {/* DIOCESAN FINANCIAL FLOW CHART MODULE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5" id="diocesan-flows-analytics-card">
          <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Liturgical Cashflow Splits
          </h3>

          <div className="space-y-4">
            {/* Total Cleared Collections */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/65 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Gross Offerings (Approved & Disbursed)</p>
                <p className="text-[10px] text-slate-400 font-mono">Completed marriages and feasts ceremonies</p>
              </div>
              <span className="text-sm font-extrabold text-emerald-800 font-mono">₹{totalReceivedOfferings.toLocaleString()}</span>
            </div>

            {/* Accrued Outstanding */}
            <div className="p-4 bg-rose-50/30 rounded-xl border border-rose-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Gross Pending offerings</p>
                <p className="text-[10px] text-slate-400 font-mono">Awaiting wedding party clearing</p>
              </div>
              <span className="text-sm font-extrabold text-rose-600 font-mono">₹{totalOutstandingAdues.toLocaleString()}</span>
            </div>

            {/* Projected Yearly Choral Splits */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Audit Status Report</p>
                <p className="text-[10px] text-slate-400 font-mono">Submitted securely to Thoothukudi Diocesan Diocesan Council</p>
              </div>
              <span className="text-[10px] bg-slate-900 text-slate-100 font-mono px-2.5 py-1 rounded font-bold uppercase">
                COMPLIANT
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
