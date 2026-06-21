import React, { useState } from 'react';
import {
  BarChart3, Users, Church, Globe, TrendingUp, Heart, Star,
  AlertCircle, CheckCircle, ChevronRight, Activity, Zap,
} from 'lucide-react';
import type { Member, Mass, Payment } from '../types';

interface SuperAdminProps {
  members: Member[];
  masses: Mass[];
  payments: Payment[];
}

// ─── Diocese / Parish Mock Hierarchy ────────────────────────────────────────
const DIOCESE_DATA = [
  {
    id: 'D001',
    name: 'Diocese of Madurai',
    parishes: 24,
    choirs: 18,
    members: 342,
    healthScore: 87,
    trend: '+12%',
    status: 'excellent',
  },
  {
    id: 'D002',
    name: 'Diocese of Tirunelveli',
    parishes: 31,
    choirs: 22,
    members: 478,
    healthScore: 74,
    trend: '+5%',
    status: 'good',
  },
  {
    id: 'D003',
    name: 'Diocese of Tanjore',
    parishes: 19,
    choirs: 14,
    members: 263,
    healthScore: 62,
    trend: '-3%',
    status: 'attention',
  },
  {
    id: 'D004',
    name: 'Archdiocese of Pondicherry',
    parishes: 42,
    choirs: 35,
    members: 721,
    healthScore: 91,
    trend: '+18%',
    status: 'excellent',
  },
  {
    id: 'D005',
    name: 'Diocese of Coimbatore',
    parishes: 28,
    choirs: 21,
    members: 412,
    healthScore: 79,
    trend: '+7%',
    status: 'good',
  },
];

const FINANCIAL_DATA = [
  { month: 'Jan', income: 48500, expenses: 32000 },
  { month: 'Feb', income: 52000, expenses: 28500 },
  { month: 'Mar', income: 61000, expenses: 35000 },
  { month: 'Apr', income: 55000, expenses: 31000 },
  { month: 'May', income: 67000, expenses: 38000 },
  { month: 'Jun', income: 72000, expenses: 41000 },
];

const statusColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  attention: 'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700',
};

const statusIcons: Record<string, React.ElementType> = {
  excellent: CheckCircle,
  good: TrendingUp,
  attention: AlertCircle,
  critical: AlertCircle,
};

// ─── Mini Bar (pure CSS, no chart lib needed) ─────────────────────────────
const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
    <div
      className={`h-full rounded-full ${color} transition-all duration-700`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

// ─── Sparkline (pure CSS, no chart lib) ─────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

type AdminTab = 'overview' | 'dioceses' | 'financial' | 'engagement';

export const SuperAdminCenter: React.FC<SuperAdminProps> = ({ members, masses, payments }) => {
  const [tab, setTab] = useState<AdminTab>('overview');

  // Derived metrics
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'Active').length;
  const avgAttendance = totalMembers > 0
    ? Math.round(members.reduce((s, m) => s + (m.attendanceRate ?? 80), 0) / totalMembers)
    : 0;
  const totalRevenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const globalHealthScore = Math.round(
    DIOCESE_DATA.reduce((s, d) => s + d.healthScore, 0) / DIOCESE_DATA.length,
  );
  const totalChoirs = DIOCESE_DATA.reduce((s, d) => s + d.choirs, 0);
  const totalParishes = DIOCESE_DATA.reduce((s, d) => s + d.parishes, 0);

  const KPI: React.FC<{
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    color: string;
    trend?: string;
  }> = ({ label, value, sub, icon: Icon, color, trend }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',   label: 'Overview',   icon: Globe },
    { id: 'dioceses',   label: 'Dioceses',   icon: Church },
    { id: 'financial',  label: 'Finance',    icon: BarChart3 },
    { id: 'engagement', label: 'Engagement', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Super Admin Command Center
              </p>
              <h1 className="mt-1 text-2xl font-black">CHOIR360 X Global</h1>
              <p className="mt-1 text-sm text-slate-400">
                Multi-Diocese · Multi-Parish · Roman Catholic Music Ministry Platform
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-emerald-400">{globalHealthScore}</div>
              <div className="text-xs font-bold text-slate-400">Global Health Score</div>
              <MiniBar value={globalHealthScore} max={100} color="bg-emerald-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPI label="Dioceses" value={DIOCESE_DATA.length} icon={Globe} color="bg-blue-600" trend="+2" />
              <KPI label="Parishes" value={totalParishes} icon={Church} color="bg-violet-600" trend="+8" />
              <KPI label="Active Choirs" value={totalChoirs} icon={Activity} color="bg-emerald-600" trend="+11" />
              <KPI label="Total Members" value={members.length + 2216} icon={Users} color="bg-amber-600" trend="+142" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPI label="Avg Attendance" value={`${avgAttendance}%`} icon={TrendingUp} color="bg-teal-600" />
              <KPI label="Active Members" value={activeMembers} sub="This choir" icon={Zap} color="bg-orange-600" />
              <KPI label="Mass Events" value={masses.length} sub="This month" icon={Star} color="bg-pink-600" />
              <KPI label="Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}K`} sub="This year" icon={BarChart3} color="bg-indigo-600" />
            </div>

            {/* Alert Panel */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-black text-slate-900">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                System Alerts
              </h3>
              <div className="space-y-2">
                {[
                  { msg: 'Diocese of Tanjore: Health score dropped below 65 (-3% trend)', level: 'warning' },
                  { msg: '12 member registrations pending approval across 4 parishes', level: 'info' },
                  { msg: 'Feast of Sts. Peter & Paul (June 29) — Mass coordination required', level: 'info' },
                  { msg: '3 choirs have not logged attendance in 30+ days', level: 'warning' },
                  { msg: 'Archdiocese of Pondicherry reached 91 health score — Excellent!', level: 'success' },
                ].map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                      a.level === 'warning'
                        ? 'bg-amber-50 text-amber-800'
                        : a.level === 'success'
                        ? 'bg-green-50 text-green-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-base">
                      {a.level === 'warning' ? '⚠️' : a.level === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    {a.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DIOCESES TAB ─────────────────────────────────────────────────── */}
        {tab === 'dioceses' && (
          <div className="space-y-3">
            {DIOCESE_DATA.map((d) => {
              const StatusIcon = statusIcons[d.status];
              return (
                <div key={d.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900">{d.name}</h3>
                      <p className="text-xs text-slate-500">
                        {d.parishes} parishes · {d.choirs} choirs · {d.members} members
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {d.trend}
                      </span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[d.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                      <span>Health Score</span>
                      <span className="font-black">{d.healthScore}/100</span>
                    </div>
                    <MiniBar
                      value={d.healthScore}
                      max={100}
                      color={
                        d.healthScore >= 80
                          ? 'bg-green-500'
                          : d.healthScore >= 65
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Attendance', value: `${Math.round(70 + d.healthScore * 0.25)}%` },
                      { label: 'Engagement', value: `${Math.round(60 + d.healthScore * 0.35)}%` },
                      { label: 'Growth', value: d.trend },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-slate-50 p-2 text-center">
                        <p className="text-sm font-black text-slate-800">{s.value}</p>
                        <p className="text-[10px] text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FINANCIAL TAB ─────────────────────────────────────────────────── */}
        {tab === 'financial' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">Total Revenue</p>
                <p className="mt-1 text-3xl font-black text-slate-900">
                  ₹{FINANCIAL_DATA.reduce((s, d) => s + d.income, 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600">H1 2026 · All dioceses</p>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-red-50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Total Expenses</p>
                <p className="mt-1 text-3xl font-black text-slate-900">
                  ₹{FINANCIAL_DATA.reduce((s, d) => s + d.expenses, 0).toLocaleString()}
                </p>
                <p className="text-xs text-rose-600">H1 2026 · All dioceses</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-black text-slate-900">Monthly Revenue vs Expenses</h3>
              <div className="space-y-3">
                {FINANCIAL_DATA.map((d) => {
                  const profit = d.income - d.expenses;
                  const maxVal = 80000;
                  return (
                    <div key={d.month}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="w-8">{d.month}</span>
                        <span className="text-green-600">₹{(d.income / 1000).toFixed(0)}K in</span>
                        <span className="text-rose-600">₹{(d.expenses / 1000).toFixed(0)}K out</span>
                        <span className={profit >= 0 ? 'text-green-700 font-black' : 'text-rose-700 font-black'}>
                          {profit >= 0 ? '+' : ''}₹{(profit / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex h-2 gap-0.5">
                        <div
                          className="h-full rounded-l-full bg-green-400"
                          style={{ width: `${(d.income / maxVal) * 100}%` }}
                        />
                        <div
                          className="h-full rounded-r-full bg-rose-400"
                          style={{ width: `${(d.expenses / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-black text-slate-900">Revenue by Diocese (H1 2026)</h3>
              <div className="space-y-2">
                {DIOCESE_DATA.map((d, i) => {
                  const rev = [72000, 95000, 52000, 148000, 83000][i];
                  return (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className="w-32 text-xs font-semibold text-slate-600 truncate">{d.name.replace('Diocese of ', '').replace('Archdiocese of ', '')}</span>
                      <div className="flex-1">
                        <MiniBar value={rev} max={160000} color="bg-violet-500" />
                      </div>
                      <span className="w-20 text-right text-xs font-black text-slate-800">₹{(rev / 1000).toFixed(0)}K</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ENGAGEMENT TAB ────────────────────────────────────────────────── */}
        {tab === 'engagement' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-black text-slate-900">Platform Engagement Metrics</h3>
              <div className="space-y-4">
                {[
                  { label: 'Monthly Active Members', value: 78, color: 'bg-blue-500', note: '78% of registered members' },
                  { label: 'Mass Attendance Rate', value: avgAttendance, color: 'bg-green-500', note: 'Average across all choirs' },
                  { label: 'Song Library Usage', value: 64, color: 'bg-violet-500', note: 'Members accessing songs monthly' },
                  { label: 'AI Tools Adoption', value: 42, color: 'bg-amber-500', note: 'Members using AI features' },
                  { label: 'Gamification Participation', value: 55, color: 'bg-pink-500', note: 'Members with badges earned' },
                  { label: 'Knowledge Hub Views', value: 31, color: 'bg-teal-500', note: 'Weekly unique readers' },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{m.label}</span>
                      <span className="font-black text-slate-900">{m.value}%</span>
                    </div>
                    <MiniBar value={m.value} max={100} color={m.color} />
                    <p className="mt-0.5 text-[10px] text-slate-400">{m.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-black text-slate-900">Top Performing Choirs</h3>
              <div className="space-y-2">
                {[
                  { name: 'Sacred Heart Choir, Pondicherry', score: 96, members: 48 },
                  { name: 'St. Mary Choir, Madurai', score: 91, members: 32 },
                  { name: 'St. Joseph Choir, Chennai', score: 88, members: 55 },
                  { name: 'Holy Cross Choir, Tirunelveli', score: 84, members: 28 },
                  { name: 'St. Anthony Choir, Coimbatore', score: 82, members: 41 },
                ].map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-700">
                      #{i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.members} members</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-green-700">{c.score}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
