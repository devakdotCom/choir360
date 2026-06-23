import React from 'react';
import { Member, Mass, Payment, Language } from '../types';
import { BarChart2, IndianRupee, Layers, Users } from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { formatINR } from '../utils/currency';
import { useParish } from '../features/parish/ParishContext';

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
  payments,
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;
  const { selectedParish } = useParish();

  const activeMembers   = members.filter((m) => m.status === 'Active Member');
  const pendingCount    = members.filter((m) => m.status === 'Pending').length;
  const singers         = activeMembers.filter((m) => m.memberType === 'Singer');
  const instrumentalists = activeMembers.filter((m) => m.memberType !== 'Singer');

  const sopranos = singers.filter((m) => m.voiceType === 'Soprano').length;
  const altos    = singers.filter((m) => m.voiceType === 'Alto').length;
  const tenors   = singers.filter((m) => m.voiceType === 'Tenor').length;
  const basses   = singers.filter((m) => m.voiceType === 'Bass').length;
  const total    = activeMembers.length || 1;

  const pct = (n: number) => Math.round((n / total) * 100);

  const specialMasses = ['Special Mass', 'Death Mass', 'Death Anniversary Mass'] as const;
  const specialPayments = payments.filter((p) =>
    specialMasses.some((t) => p.massType?.includes(t.split(' ')[0]) || p.massType === t)
  );

  const totalReceived    = payments.filter((p) => p.status === 'Received').reduce((s, p) => s + (p.receivedAmount || p.promisedAmount), 0);
  const totalPending     = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.pendingAmount, 0);
  const totalProposed    = payments.reduce((s, p) => s + p.promisedAmount, 0);

  const avgAttendance = Math.round(
    activeMembers.reduce((s, m) => s + (m.attendanceRate ?? 0), 0) / Math.max(activeMembers.length, 1)
  );

  const parishLabel = selectedParish?.parishName ?? 'Parish';

  const voiceParts = [
    { label: 'Soprano', count: sopranos, color: 'bg-emerald-500' },
    { label: 'Alto',    count: altos,    color: 'bg-blue-500'    },
    { label: 'Tenor',   count: tenors,   color: 'bg-amber-500'   },
    { label: 'Bass',    count: basses,   color: 'bg-purple-500'  },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-1.5">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            Parish Choral & Finance Analytics
          </h2>
          <p className="text-xs text-slate-500">
            {parishLabel} — vocal register, liturgy logs, and fund splits
          </p>
        </div>
        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold text-xs text-emerald-800">
          Real-time data
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Choralists', value: activeMembers.length, sub: `${pendingCount} pending application${pendingCount !== 1 ? 's' : ''}`, icon: Users, color: 'text-blue-600' },
          { label: 'Total Offerings',   value: formatINR(totalReceived),  sub: totalReceived > 0 ? 'Received & cleared' : 'No payments yet', icon: IndianRupee, color: 'text-emerald-600' },
          { label: 'Dues Outstanding',  value: formatINR(totalPending),   sub: `${payments.filter((p) => p.status === 'Pending').length} open invoice${payments.filter((p) => p.status === 'Pending').length !== 1 ? 's' : ''}`, icon: IndianRupee, color: 'text-rose-600' },
          { label: 'Liturgy Log',       value: masses.length,             sub: masses.length > 0 ? `${specialPayments.length} special mass${specialPayments.length !== 1 ? 'es' : ''}` : 'No masses logged yet', icon: BarChart2, color: 'text-violet-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5 flex flex-col">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{card.label}</p>
            <p className={`text-2xl font-extrabold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Voice part distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-emerald-600" />
            Four-Part Harmony Saturation
          </h3>

          {activeMembers.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No active members yet.</p>
          ) : (
            <div className="space-y-4">
              {voiceParts.map(({ label, count, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-bold">{label}</span>
                    <span className="font-mono">{count} singer{count !== 1 ? 's' : ''} ({pct(count)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${pct(count)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>{singers.length} Singer{singers.length !== 1 ? 's' : ''}</span>
                <span>{instrumentalists.length} Instrumentalist{instrumentalists.length !== 1 ? 's' : ''}</span>
                <span>Avg attendance {avgAttendance}%</span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            Optimal ratio: Soprano 40% · Alto 30% · Tenor 15% · Bass 15%
          </p>
        </div>

        {/* Financial cashflow */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            Liturgical Cashflow Summary
          </h3>

          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Gross Offerings (Received)</p>
                <p className="text-[10px] text-slate-400">
                  {payments.filter((p) => p.status === 'Received').length} payment{payments.filter((p) => p.status === 'Received').length !== 1 ? 's' : ''} cleared
                </p>
              </div>
              <span className="text-sm font-extrabold text-emerald-800 font-mono">{formatINR(totalReceived)}</span>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Gross Pending Dues</p>
                <p className="text-[10px] text-slate-400">Awaiting payment clearance</p>
              </div>
              <span className="text-sm font-extrabold text-rose-600 font-mono">{formatINR(totalPending)}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Total Proposed</p>
                <p className="text-[10px] text-slate-400">{payments.length} payment record{payments.length !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm font-extrabold text-slate-700 font-mono">{formatINR(totalProposed)}</span>
            </div>

            {/* Payment status breakdown */}
            {payments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-700">{payments.filter((p) => p.status === 'Received').length}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Received</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-lg font-bold text-amber-700">{payments.filter((p) => p.status === 'Pending').length}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Pending</p>
                </div>
              </div>
            )}

            {payments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">No payment records yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming / recent masses table */}
      {masses.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 mb-4">
            Recent Liturgy Log
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
                  <th className="pb-2">Mass Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Language</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {masses.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-800">{m.name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        m.category === 'Special Mass' || m.category === 'Death Mass' || m.category === 'Death Anniversary Mass'
                          ? 'bg-amber-50 text-amber-800 border border-amber-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.category}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">{m.date}</td>
                    <td className="py-2.5 text-slate-500">{m.time}</td>
                    <td className="py-2.5 text-slate-500">{m.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
