import React from 'react';
import { Announcement, ChoirEvent, Language, Mass, Member, Payment } from '../types';
import {
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MapPin,
  Mic2,
  Music2,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound,
} from 'lucide-react';

interface LandingPageProps {
  currentLang: Language;
  onNavigate: (section: string) => void;
  members: Member[];
  masses: Mass[];
  payments: Payment[];
  events: ChoirEvent[];
  announcements: Announcement[];
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  members,
  masses,
  payments,
  events,
  announcements,
}) => {
  const activeMembers = members.filter((member) => member.status === 'Active Member');
  const pendingMembers = members.filter((member) => member.status !== 'Active Member');
  const nextMass = masses[0];
  const nextPractice = events[0];
  const pendingCollections = payments.reduce((sum, payment) => sum + payment.pendingAmount, 0);
  const averageAttendance = Math.round(
    activeMembers.reduce((sum, member) => sum + (member.attendanceRate ?? 0), 0) / Math.max(activeMembers.length, 1),
  );

  const servicePlan: Array<{ label: string; title: string; meta: string; ready: boolean }> = [];
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="overflow-hidden rounded-[28px] bg-[#18392f] text-white shadow-[0_24px_80px_rgba(18,52,43,0.18)]">
        <div className="grid lg:grid-cols-[1.45fr_0.8fr]">
          <div className="relative p-7 sm:p-9">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-4 -top-8 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative">
              <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                Tuesday · Ordinary Time · Green
              </p>
              <p className="text-sm font-medium text-emerald-100">Good morning, Gabriel</p>
              <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                Your ministry is ready for Sunday.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100/80">
                The choir is 82% confirmed. One communion hymn and two member responses still need your attention.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('mass_management')}
                  className="flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#18392f] transition hover:bg-amber-200"
                >
                  Finish Sunday plan <ArrowUpRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onNavigate('unified_calendar')}
                  className="rounded-xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold transition hover:bg-white/14"
                >
                  View calendar
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 p-7 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">Next liturgy</p>
            <h3 className="mt-3 text-xl font-bold">{nextMass?.name}</h3>
            <div className="mt-5 space-y-3 text-sm text-emerald-50/80">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-300" /> Sunday, 21 June</p>
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" /> {nextMass?.time}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-300" /> St. Thomas Cathedral</p>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/8 p-3">
              <div className="flex -space-x-2">
                {activeMembers.slice(0, 4).map((member) => (
                  <img key={member.id} src={member.photoUrl} alt="" className="h-8 w-8 rounded-full border-2 border-[#23463b] object-cover" />
                ))}
              </div>
              <div>
                <p className="text-sm font-bold">{activeMembers.length} confirmed</p>
                <p className="text-[10px] text-emerald-100/60">2 awaiting response</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active members', value: activeMembers.length, detail: `${pendingMembers.length} need review`, icon: UsersRound, color: 'bg-blue-50 text-blue-700' },
          { label: 'Attendance', value: `${averageAttendance}%`, detail: '+4% this month', icon: UserCheck, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pending collection', value: formatMoney(pendingCollections), detail: `${payments.filter((p) => p.status === 'Pending').length} open payments`, icon: CircleDollarSign, color: 'bg-amber-50 text-amber-700' },
          { label: 'Choir health', value: 'Excellent', detail: 'Score 91 / 100', icon: TrendingUp, color: 'bg-violet-50 text-violet-700' },
        ].map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p>
            <p className="mt-3 text-[11px] text-slate-400">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Sunday preparation</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Liturgy music plan</h3>
            </div>
            <button onClick={() => onNavigate('song_library')} className="text-xs font-bold text-emerald-700">Open library</button>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {servicePlan.length === 0 && (
              <button onClick={() => onNavigate('song_library')} className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">
                  <Music2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">No songs selected yet</p>
                  <p className="text-xs text-slate-500">Open the imported PDF Music Library to build the liturgy plan.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            )}
            {servicePlan.map((song) => (
              <button key={song.label} onClick={() => onNavigate('song_library')} className="flex w-full items-center gap-4 py-4 text-left">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${song.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {song.ready ? <Check className="h-5 w-5" /> : <Music2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{song.label}</p>
                  <p className="truncate text-sm font-bold text-slate-800">{song.title}</p>
                  <p className="text-xs text-slate-500">{song.meta}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-3xl bg-[#f1e9da] p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-800">AI insight</span>
          </div>
          <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-900">Your alto section needs support.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sunday’s current voice balance is 3 soprano, 1 alto, 2 tenor and 2 bass. Priya has an 88% availability match.
          </p>
          <button onClick={() => onNavigate('ai_hub')} className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-900">
            Ask Choir360 AI <ArrowUpRight className="h-4 w-4" />
          </button>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <Mic2 className="h-5 w-5 text-violet-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Next rehearsal</p>
          <h3 className="mt-1 font-bold text-slate-900">{nextPractice?.name}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">{nextPractice?.date} · {nextPractice?.time}</p>
          <button onClick={() => onNavigate('unified_calendar')} className="mt-4 text-xs font-bold text-emerald-700">Manage rehearsal</button>
        </article>
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <BookOpenText className="h-5 w-5 text-amber-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Daily word</p>
          <h3 className="mt-1 font-bold text-slate-900">“Your Father knows what you need.”</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Matthew 6:7-15 · Tuesday of the Eleventh Week</p>
          <button className="mt-4 text-xs font-bold text-emerald-700">Read reflection</button>
        </article>
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Parish update</p>
          <h3 className="mt-1 font-bold text-slate-900">{announcements[0]?.title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{announcements[0]?.content}</p>
          <button className="mt-4 text-xs font-bold text-emerald-700">Read announcement</button>
        </article>
      </section>
    </div>
  );
};
