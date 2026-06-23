import React, { useMemo } from 'react';
import { RadioPlayer } from './RadioPlayer';
import { Announcement, ChoirEvent, Language, Mass, Member, Payment } from '../types';
import {
  ArrowUpRight,
  BookOpen,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  IndianRupee,
  MapPin,
  Mic2,
  Music2,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { formatINR } from '../utils/currency';
import { getISTGreeting } from '../utils/timezone';
import { useParish } from '../features/parish/ParishContext';

interface LandingPageProps {
  currentLang: Language;
  onNavigate: (section: string) => void;
  members: Member[];
  masses: Mass[];
  payments: Payment[];
  events: ChoirEvent[];
  announcements: Announcement[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  members,
  masses,
  payments,
  events,
  announcements,
}) => {
  const { selectedParish } = useParish();
  const parishName = selectedParish?.parishName ?? 'your parish';
  const parishPlace = selectedParish?.place ?? '';

  const greeting = useMemo(() => getISTGreeting(), []);

  const activeMembers = members.filter((m) => m.status === 'Active Member');
  const pendingMembers = members.filter((m) => m.status !== 'Active Member');
  const nextMass = masses[0];
  const nextPractice = events.find((e) => e.category === 'Choir Practice') ?? events[0];
  const pendingCollections = payments.reduce((sum, p) => sum + p.pendingAmount, 0);
  const openPaymentCount = payments.filter((p) => p.status === 'Pending').length;
  const averageAttendance = Math.round(
    activeMembers.reduce((sum, m) => sum + (m.attendanceRate ?? 0), 0) / Math.max(activeMembers.length, 1),
  );

  const totalMembersCount = members.length;
  const activeRatio = totalMembersCount > 0 ? activeMembers.length / totalMembersCount : 0;
  const healthScore = Math.min(100, Math.round(activeRatio * 50 + averageAttendance * 0.5));
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs attention';

  const confirmedPercent = totalMembersCount > 0 ? Math.round((activeMembers.length / totalMembersCount) * 100) : 0;
  const heroSummary = totalMembersCount === 0
    ? 'No members registered yet. Start by adding choir members.'
    : `${confirmedPercent}% of choir members are active. ${pendingMembers.length > 0 ? `${pendingMembers.length} pending review.` : 'All members are active.'}`;

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });

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
                {todayLabel} · Archdiocese of Madras-Mylapore
              </p>
              <p className="text-sm font-medium text-emerald-100">
                {greeting}, {parishName}
              </p>
              <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                {nextMass ? 'Your ministry is ready for Sunday.' : 'Welcome to CHOIR360 X.'}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100/80">
                {heroSummary}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('masses')}
                  className="flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#18392f] transition hover:bg-amber-200"
                >
                  {nextMass ? 'Finish Sunday plan' : 'Plan a Mass'} <ArrowUpRight className="h-4 w-4" />
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
            {nextMass ? (
              <>
                <h3 className="mt-3 text-xl font-bold">{nextMass.name}</h3>
                <div className="mt-5 space-y-3 text-sm text-emerald-50/80">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-300" />
                    {new Date(nextMass.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
                  </p>
                  <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-300" /> {nextMass.time}</p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    {parishName}{parishPlace ? `, ${parishPlace}` : ''}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-emerald-100/60">No upcoming liturgy scheduled</p>
            )}

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/8 p-3">
              {activeMembers.length > 0 ? (
                <div className="flex -space-x-2">
                  {activeMembers.slice(0, 4).map((member) => (
                    <img
                      key={member.id}
                      src={member.photoUrl}
                      alt=""
                      className="h-8 w-8 rounded-full border-2 border-[#23463b] object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <UsersRound className="h-4 w-4 text-white/60" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold">{activeMembers.length} confirmed</p>
                <p className="text-[10px] text-emerald-100/60">
                  {pendingMembers.length > 0 ? `${pendingMembers.length} awaiting response` : 'All confirmed'}
                </p>
              </div>
            </div>
            <RadioPlayer />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active members',
            value: activeMembers.length.toString(),
            detail: pendingMembers.length > 0 ? `${pendingMembers.length} need review` : 'All active',
            icon: UsersRound,
            color: 'bg-blue-50 text-blue-700',
          },
          {
            label: 'Attendance',
            value: `${averageAttendance}%`,
            detail: averageAttendance > 0 ? 'Average this period' : 'No attendance data yet',
            icon: UserCheck,
            color: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Pending collection',
            value: formatINR(pendingCollections),
            detail: `${openPaymentCount} open payment${openPaymentCount !== 1 ? 's' : ''}`,
            icon: IndianRupee,
            color: 'bg-amber-50 text-amber-700',
          },
          {
            label: 'Choir health',
            value: healthLabel,
            detail: `Score ${healthScore} / 100`,
            icon: TrendingUp,
            color: 'bg-violet-50 text-violet-700',
          },
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
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Parish Liturgy Log</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Logged Masses</h3>
            </div>
            <button onClick={() => onNavigate('masses')} className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {masses.length === 0 ? (
              <button
                onClick={() => onNavigate('masses')}
                className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">No masses logged yet</p>
                  <p className="text-xs text-slate-500">Go to Masses & Accounts to log your first liturgy.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ) : (
              masses.slice(0, 4).map((mass) => {
                const isSpecial = ['Special Mass', 'Death Mass', 'Death Anniversary Mass'].includes(mass.category);
                return (
                  <button
                    key={mass.id}
                    onClick={() => onNavigate('masses')}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-left hover:bg-slate-100 transition"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSpecial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{mass.name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${isSpecial ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                          {mass.category}
                        </span>
                        {mass.date} · {mass.time}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{mass.language}</span>
                  </button>
                );
              })
            )}
            {masses.length > 4 && (
              <button onClick={() => onNavigate('masses')} className="w-full py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition text-center">
                View all {masses.length} masses →
              </button>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-[#f1e9da] p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-800">AI insight</span>
          </div>
          {activeMembers.length > 0 ? (
            <>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-900">
                {activeMembers.length < 4 ? 'Your choir needs more members.' : 'Your choir is active.'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''} registered
                {parishName !== 'your parish' ? ` at ${parishName}` : ''}.
                {pendingMembers.length > 0 ? ` ${pendingMembers.length} application${pendingMembers.length !== 1 ? 's' : ''} awaiting review.` : ' All applications reviewed.'}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-slate-900">Get started with your choir.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                No members registered yet. Add choir members to begin tracking attendance, payments, and liturgy planning.
              </p>
            </>
          )}
          <button onClick={() => onNavigate('ai_hub')} className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-900">
            Ask Choir360 AI <ArrowUpRight className="h-4 w-4" />
          </button>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <Mic2 className="h-5 w-5 text-violet-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Next rehearsal</p>
          {nextPractice ? (
            <>
              <h3 className="mt-1 font-bold text-slate-900">{nextPractice.name}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{nextPractice.date} · {nextPractice.time}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-400">No rehearsal scheduled</p>
          )}
          <button onClick={() => onNavigate('unified_calendar')} className="mt-4 text-xs font-bold text-emerald-700">Manage rehearsal</button>
        </article>
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <BookOpenText className="h-5 w-5 text-amber-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Daily word</p>
          <h3 className="mt-1 font-bold text-slate-900">"Your Father knows what you need."</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Matthew 6:7-15 · Daily readings</p>
          <button onClick={() => onNavigate('bible')} className="mt-4 text-xs font-bold text-emerald-700">Read reflection</button>
        </article>
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Parish update</p>
          {announcements[0] ? (
            <>
              <h3 className="mt-1 font-bold text-slate-900">{announcements[0].title}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{announcements[0].content}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-400">No announcements yet</p>
          )}
          <button className="mt-4 text-xs font-bold text-emerald-700">Read announcement</button>
        </article>
      </section>
    </div>
  );
};
