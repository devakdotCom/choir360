import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, Bell, CalendarDays, Church, Command,
  HeartHandshake, LayoutDashboard, Menu, Music2, Search,
  Sparkles, Star, UserPlus, UsersRound, X, BookOpen, BookText,
} from 'lucide-react';
import { Announcement, ChoirEvent, Language, Mass, Member, MemberStatus, Payment, Rehearsal, AttendanceRecord, Role } from './types';
import { RoleSelector } from './components/RoleSelector';
import { AuthPanel } from './components/AuthPanel';
import { AccessDenied } from './components/AccessDenied';
import { MOCK_ANNOUNCEMENTS, MOCK_EVENTS, MOCK_MASSES, MOCK_MEMBERS, MOCK_PAYMENTS, MOCK_REHEARSALS } from './data/mockData';
import { useSyncedCollection } from './hooks/useSyncedCollection';
import { useMembersWithPrivateData } from './hooks/useMembersWithPrivateData';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useRoleGuard } from './hooks/useRoleGuard';
import { createRecordMetadata, DEFAULT_TENANT_CONTEXT, type TenantContext } from './services/recordMetadata';
import { ARCHDIOCESE_ID } from './data/madrasMylaporeParishes';
import { ParishProvider } from './features/parish/ParishContext';
import { ParishSidebarCard, ParishOnboardingModal } from './features/parish/ParishSelector';
import { useParish } from './features/parish/ParishContext';

// Song data is lazy-loaded inside SongLibraryWidget to keep the main bundle small.
// We use an empty array here for global search (searches within song library navigate to the tab).
const ALL_SONGS: { id: string; displayTitle?: string; title?: string; pageNumber?: number; sourcePageNumber?: number; category?: string; lyrics?: string; composer?: string }[] = [];

type Tab =
  | 'landing'
  | 'calendar'
  | 'masses'
  | 'registration'
  | 'dashboard_member'
  | 'bible'
  | 'song_library'
  | 'ai_hub'
  | 'analytics'
  | 'catholic_hub'
  | 'liturgical_planner'
  | 'gamification'
  | 'rehearsals';

const TAB_REQUIRED_ROLE: Record<Tab, Role> = {
  landing: 'public_user',
  calendar: 'public_user',
  bible: 'public_user',
  song_library: 'public_user',
  registration: 'public_user',
  catholic_hub: 'public_user',
  liturgical_planner: 'choir_member',
  dashboard_member: 'choir_member',
  masses: 'choir_member',
  ai_hub: 'choir_member',
  gamification: 'choir_member',
  analytics: 'choir_admin',
  rehearsals: 'choir_member',
};

// ─── Lazy Imports ─────────────────────────────────────────────────────────────
const RehearsalManager = React.lazy(() => import('./components/RehearsalManager').then((m) => ({ default: m.RehearsalManager })));

const LandingPage = React.lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })));
const MemberRegistration = React.lazy(() => import('./components/MemberRegistration').then((m) => ({ default: m.MemberRegistration })));
const DashboardMember = React.lazy(() => import('./components/DashboardMember').then((m) => ({ default: m.DashboardMember })));
const MassManagement = React.lazy(() => import('./components/MassManagement').then((m) => ({ default: m.MassManagement })));
const BibleViewer = React.lazy(() => import('./components/BibleViewer').then((m) => ({ default: m.BibleViewer })));
const SongLibraryWidget = React.lazy(() => import('./components/SongLibraryWidget').then((m) => ({ default: m.SongLibraryWidget })));
const AiToolsHub = React.lazy(() => import('./components/AiToolsHub').then((m) => ({ default: m.AiToolsHub })));
const UnifiedCalendar = React.lazy(() => import('./components/UnifiedCalendar').then((m) => ({ default: m.UnifiedCalendar })));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard })));
const CatholicKnowledgeHub = React.lazy(() => import('./components/CatholicKnowledgeHub').then((m) => ({ default: m.CatholicKnowledgeHub })));
const LiturgicalPlanner = React.lazy(() => import('./components/LiturgicalPlanner').then((m) => ({ default: m.LiturgicalPlanner })));
const GamificationProfileView = React.lazy(() => import('./components/GamificationProfile').then((m) => ({ default: m.GamificationProfileView })));

// ─── Nav Config ──────────────────────────────────────────────────────────────
const navItems: { id: Tab; label: string; icon: React.ElementType; minRole: Role }[] = [
  { id: 'landing',             label: 'Overview',         icon: LayoutDashboard, minRole: 'public_user' },
  { id: 'calendar',            label: 'Calendar',         icon: CalendarDays,    minRole: 'public_user' },
  { id: 'masses',              label: 'Liturgy & Masses', icon: Church,          minRole: 'choir_member' },
  { id: 'bible',               label: 'Bible',            icon: BookText,        minRole: 'public_user' },
  { id: 'song_library',        label: 'Music Library',    icon: Music2,          minRole: 'public_user' },
  { id: 'registration',        label: 'People',           icon: UsersRound,      minRole: 'public_user' },
  { id: 'dashboard_member',    label: 'My Ministry',      icon: HeartHandshake,  minRole: 'choir_member' },
  { id: 'catholic_hub',        label: 'Catholic Hub',     icon: BookOpen,        minRole: 'public_user' },
  { id: 'liturgical_planner',  label: 'AI Mass Planner',  icon: Sparkles,        minRole: 'choir_member' },
  { id: 'gamification',        label: 'My Achievements',  icon: Star,            minRole: 'choir_member' },
  { id: 'analytics',           label: 'Insights',         icon: BarChart3,       minRole: 'choir_admin' },
  { id: 'rehearsals',          label: 'Rehearsals',       icon: Music2,          minRole: 'choir_member' },
];

const languages: { id: Language; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ta', label: 'Tamil' },
  { id: 'ml', label: 'Malayalam' },
  { id: 'te', label: 'Telugu' },
  { id: 'hi', label: 'Hindi' },
];

const ModuleSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-1/3 rounded-full bg-slate-200" />
        <div className="mt-3 h-3 w-2/3 rounded-full bg-slate-100" />
        <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

const NoMemberProfile = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
    <h2 className="mt-4 text-lg font-bold text-slate-900">No member profile yet</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
      Create or approve a real choir member profile to unlock the member dashboard.
    </p>
  </div>
);

// Reads parish from context for breadcrumb — defined here to avoid prop drilling
const BreadcrumbParishLabel: React.FC = () => {
  const { selectedParish } = useParish();
  const name = selectedParish ? selectedParish.parishName : 'Archdiocese of Madras-Mylapore';
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {name} / Choir
    </p>
  );
};

// AppInner lives inside <ParishProvider> so useParish() works.
function AppInner() {
  const { selectedParish, archdioceseId } = useParish();

  // Build TenantContext from the selected parish; fall back to DEFAULT_TENANT_CONTEXT.
  const tenantContext: TenantContext = React.useMemo(() => {
    if (!selectedParish) return DEFAULT_TENANT_CONTEXT;
    return {
      archdioceseId: selectedParish.archdioceseId,
      parishName: selectedParish.displayName,
      tenantId: archdioceseId ?? ARCHDIOCESE_ID,
      parishId: selectedParish.id,
      choirId: `${selectedParish.id}-choir`,
    };
  }, [selectedParish, archdioceseId]);


  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [demoRole, setDemoRole] = useState<Role>('choir_admin');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const authState = useFirebaseAuth();

  // SECURITY: effectiveRole always from Firebase custom claims when configured.
  // demoRole only applies when Firebase is NOT configured (pure demo mode).
  const effectiveRole: Role = authState.isConfigured ? authState.effectiveRole : demoRole;
  const guard = useRoleGuard(effectiveRole);
  // Anonymous users (signed in only for Cloudinary uploads) must NOT trigger
  // Firestore listeners — they have no tenant JWT claims, so every collection
  // read returns "Missing or insufficient permissions".
  const syncEnabled = Boolean(authState.user && !authState.user.isAnonymous);

  const { records: members, isLive: membersLive, syncError: membersSyncError, actions: memberSync } =
    useMembersWithPrivateData(MOCK_MEMBERS, syncEnabled, tenantContext);
  const { records: masses, actions: massSync } =
    useSyncedCollection<Mass>('masses', MOCK_MASSES, syncEnabled, tenantContext);
  const { records: payments, actions: paymentSync } =
    useSyncedCollection<Payment>('payments', MOCK_PAYMENTS, syncEnabled, tenantContext);
  const { records: events, actions: eventSync } =
    useSyncedCollection<ChoirEvent>('events', MOCK_EVENTS, syncEnabled, tenantContext);
  const { records: announcements } =
    useSyncedCollection<Announcement>('announcements', MOCK_ANNOUNCEMENTS, syncEnabled, tenantContext);
  const { records: rehearsals, actions: rehearsalSync } =
    useSyncedCollection<Rehearsal>('rehearsals', MOCK_REHEARSALS, syncEnabled, tenantContext);

  useEffect(() => {
    if (!authState.user && TAB_REQUIRED_ROLE[activeTab] !== 'public_user') {
      setActiveTab('landing');
    }
  }, [authState.user, activeTab]);

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    setMobileMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------
  // GLOBAL SEARCH — searches members, songs, and masses already loaded in
  // memory. Was previously a decorative input with no logic behind it.
  // ---------------------------------------------------------------------
  type GlobalSearchResult = {
    key: string;
    category: 'People' | 'Songs' | 'Masses';
    title: string;
    subtitle: string;
    onSelect: () => void;
  };

  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    const query = globalSearchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    const memberResults: GlobalSearchResult[] = members
      .filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(query)
        || (m.voiceType || '').toLowerCase().includes(query)
        || (m.choirName || '').toLowerCase().includes(query)
      )
      .slice(0, 4)
      .map((m) => ({
        key: `member-${m.id}`,
        category: 'People' as const,
        title: `${m.firstName} ${m.lastName}`,
        subtitle: `${m.voiceType || 'Member'} · ${m.status}`,
        onSelect: () => navigate('registration'),
      }));

    const songResults: GlobalSearchResult[] = ALL_SONGS
      .filter((s) =>
        (s.displayTitle || s.title || '').toLowerCase().includes(query)
        || (s.lyrics || '').toLowerCase().includes(query)
        || (s.composer || '').toLowerCase().includes(query)
      )
      .slice(0, 4)
      .map((s) => ({
        key: `song-${s.id}`,
        category: 'Songs' as const,
        title: s.displayTitle || s.title || 'Untitled Song',
        subtitle: `Page ${s.pageNumber ?? s.sourcePageNumber ?? '-'} · ${s.category}`,
        onSelect: () => navigate('song_library'),
      }));

    const massResults: GlobalSearchResult[] = masses
      .filter((m) =>
        (m.name || '').toLowerCase().includes(query)
        || (m.category || '').toLowerCase().includes(query)
      )
      .slice(0, 4)
      .map((m) => ({
        key: `mass-${m.id}`,
        category: 'Masses' as const,
        title: m.name,
        subtitle: `${m.date} · ${m.time}`,
        onSelect: () => navigate('masses'),
      }));

    return [...memberResults, ...songResults, ...massResults].slice(0, 10);
  }, [globalSearchQuery, members, masses]);

  useEffect(() => {
    if (!isSearchResultsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchResultsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchResultsOpen]);

  const handleSelectSearchResult = (result: GlobalSearchResult) => {
    result.onSelect();
    setGlobalSearchQuery('');
    setIsSearchResultsOpen(false);
  };

  const handleDemoRoleChange = (role: Role) => {
    setDemoRole(role);
    navigate(role === 'choir_member' ? 'dashboard_member' : role === 'public_user' ? 'registration' : 'landing');
  };

  const handleUpdateMemberStatus = (memberId: string, status: MemberStatus, note?: string) => {
    if (!guard.isAdmin) return;
    void memberSync.patch(memberId, { status, correctionNote: note ?? '' });
  };

  const currentMember = members.find((m) => m.id === authState.user?.uid) ?? members[0];

  const activeLabel = navItems.find((item) => item.id === activeTab)?.label ?? 'Overview';
  const pendingCount = members.filter((m) => m.status === 'Pending').length;

  return (
    <>
    <ParishOnboardingModal />
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f6f7f5] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#102d26] text-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button onClick={() => navigate('landing')} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-[#153a30]">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-serif text-lg font-bold leading-none tracking-wide">CHOIR360 X</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60">Catholic Music Ecosystem</p>
            </div>
          </button>

          <div ref={searchContainerRef} className="relative ml-auto hidden max-w-md flex-1 lg:block">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/8 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={globalSearchQuery}
                onChange={(e) => { setGlobalSearchQuery(e.target.value); setIsSearchResultsOpen(true); }}
                onFocus={() => setIsSearchResultsOpen(true)}
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400"
                placeholder="Search people, songs, masses..."
                aria-label="Global search"
              />
              <Command className="h-3.5 w-3.5 text-slate-500" />
            </div>

            {isSearchResultsOpen && globalSearchQuery.trim().length >= 2 && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
                {globalSearchResults.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-500">No matches for "{globalSearchQuery}".</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {globalSearchResults.map((result) => (
                      <li key={result.key}>
                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-slate-900">{result.title}</span>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                              {result.category}
                            </span>
                          </span>
                          <span className="truncate text-xs text-slate-500">{result.subtitle}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <div className="hidden items-center rounded-xl border border-white/10 bg-white/8 p-1 md:flex">
              {languages.map((language) => (
                <button key={language.id} onClick={() => setCurrentLang(language.id)}
                  className={"rounded-lg px-2 py-1.5 text-[10px] font-bold " + (currentLang === language.id ? 'bg-white text-[#153a30]' : 'text-slate-300')}>
                  {language.label}
                </button>
              ))}
            </div>
            <button className="relative min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/8 p-2.5" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
            </button>
            {!authState.isConfigured && (
              <RoleSelector currentRole={demoRole} setRole={handleDemoRoleChange} />
            )}
            {authState.isConfigured && authState.user && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  {effectiveRole.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* SIDEBAR */}
        <aside className={(mobileNavOpen ? 'fixed inset-x-0 top-16 z-40 flex' : 'hidden') + ' min-h-[calc(100dvh-4rem)] w-64 flex-col border-r border-slate-200/80 bg-white p-4 lg:sticky lg:top-16 lg:flex'}>
          <ParishSidebarCard
            songCount={0}
            syncStatus={
              <>
                Sync:{' '}
                <span className={membersLive ? 'text-emerald-700' : syncEnabled ? 'text-amber-700' : 'text-slate-400'}>
                  {membersLive
                    ? 'Firebase live'
                    : syncEnabled
                    ? 'Connecting…'
                    : authState.user?.isAnonymous
                    ? 'Guest mode'
                    : 'Sign in required'}
                </span>
                {membersSyncError && !membersSyncError.includes('insufficient permissions') && (
                  <span className="block truncate text-rose-600">{membersSyncError}</span>
                )}
              </>
            }
          />

          <div className="mt-4">
            <AuthPanel
              user={authState.user}
              isConfigured={authState.isConfigured}
              authError={authState.authError}
              effectiveRole={authState.effectiveRole}
              onSignIn={authState.signIn}
              onCreateAccount={authState.createAccount}
              onLogout={authState.logout}
              onRefreshToken={authState.refreshToken}
              onOpenRegistration={() => navigate('registration')}
            />
          </div>

          <nav className="mt-5 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navItems
              .filter((item) => !authState.isConfigured || guard.canAccess(item.minRole) || item.minRole === 'public_user')
              .map((item) => {
                const accessible = guard.canAccess(item.minRole);
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => { if (accessible) navigate(item.id); }} disabled={!accessible}
                    aria-current={isActive ? 'page' : undefined}
                    className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ' +
                      (isActive ? 'bg-[#18392f] text-white shadow-sm' : accessible ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'cursor-not-allowed text-slate-300')}>
                    <item.icon className={'h-4 w-4 ' + (isActive ? 'text-amber-300' : accessible ? 'text-slate-400' : 'text-slate-300')} />
                    {item.label}
                    {item.id === 'registration' && pendingCount > 0 && (
                      <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">{pendingCount}</span>
                    )}
                    {!accessible && authState.isConfigured && (
                      <span className="ml-auto text-[9px] text-slate-300">[locked]</span>
                    )}
                  </button>
                );
              })}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <BreadcrumbParishLabel />
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{activeLabel}</h1>
            </div>
            {guard.isAdmin && (
              <button onClick={() => navigate('registration')}
                className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-[#18392f] px-4 py-2.5 text-xs font-bold text-white shadow-sm sm:flex">
                <UserPlus className="h-4 w-4 text-amber-300" /> Add member
              </button>
            )}
          </div>

          <Suspense fallback={<ModuleSkeleton />}>
            {activeTab === 'landing' && (
              <LandingPage currentLang={currentLang} members={members} masses={masses} payments={payments}
                events={events} announcements={announcements}
                onNavigate={(section) => navigate(section === 'songs_library' ? 'song_library' : section === 'unified_calendar' ? 'calendar' : section as Tab)} />
            )}
            {activeTab === 'calendar' && (
              <UnifiedCalendar currentLang={currentLang} masses={masses} events={events}
                onAddEvent={(event) => {
                  if (!guard.isAdmin) return;
                  void eventSync.upsert({ ...event, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid);
                }} />
            )}
            {activeTab === 'masses' && (
              guard.canAccess('choir_member') ? (
                <MassManagement currentLang={currentLang} masses={masses} payments={payments} members={members}
                  onAddMass={(mass) => {
                    if (!guard.canAccess('choir_member')) {
                      return Promise.resolve({ ok: false, error: 'Missing or insufficient permissions.' });
                    }
                    return massSync.upsert({ ...mass, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid);
                  }}
                  onUpdateMass={(mass) => {
                    if (!guard.isAdmin) {
                      return Promise.resolve({ ok: false, error: 'Admin access required.' });
                    }
                    return massSync.upsert({ ...mass, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid);
                  }}
                  onDeleteMass={(massId) => {
                    if (!guard.isAdmin) return;
                    void massSync.patch(massId, { status: 'deleted' } as any, authState.user?.uid);
                  }}
                  onAddPayment={(payment) => {
                    if (!guard.isAdmin) {
                      return Promise.resolve({ ok: false, error: 'Admin access required.' });
                    }
                    return paymentSync.upsert({ ...payment, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid);
                  }}
                  onUpdatePayment={(id, receivedAmount, status) => {
                    if (!guard.isAdmin) return;
                    const payment = payments.find((item) => item.id === id);
                    void paymentSync.patch(id, { receivedAmount, pendingAmount: Math.max((payment?.promisedAmount ?? 0) - receivedAmount, 0), status }, authState.user?.uid);
                  }} />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
            {activeTab === 'registration' && (
              <MemberRegistration currentLang={currentLang} currentUserRole={effectiveRole} members={members}
                onAddMember={(member) => void memberSync.upsert({ ...member, ...createRecordMetadata(authState.user?.uid ?? 'public_user', 'Pending', tenantContext) }, authState.user?.uid)}
                onUpdateMemberStatus={handleUpdateMemberStatus} />
            )}
            {activeTab === 'dashboard_member' && (
              guard.canAccess('choir_member') ? (
                currentMember ? (
                  <DashboardMember currentLang={currentLang} memberId={authState.user?.uid ?? currentMember.id}
                    members={members} events={events} masses={masses}
                    onUpdateMemberDetails={(updated) => void memberSync.upsert({ ...updated, ...createRecordMetadata(authState.user?.uid ?? updated.id, updated.status, tenantContext) }, authState.user?.uid)}
                    onUpdateEventRsvp={(eventId, memberId, status) => {
                      const event = events.find((item) => item.id === eventId);
                      if (event) void eventSync.patch(eventId, { rsvps: { ...event.rsvps, [memberId]: status } }, authState.user?.uid);
                    }} />
                ) : <NoMemberProfile />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
            {activeTab === 'song_library' && <SongLibraryWidget currentLang={currentLang} />}
            {activeTab === 'bible' && <BibleViewer />}
            {activeTab === 'ai_hub' && (
              guard.canAccess('choir_member') ? (
                <AiToolsHub currentLang={currentLang} members={members} masses={masses} />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
            {activeTab === 'analytics' && (
              guard.canAccess('choir_admin') ? (
                <AnalyticsDashboard currentLang={currentLang} members={members} masses={masses} payments={payments} />
              ) : <AccessDenied requiredRole="choir_admin" />
            )}
            {activeTab === 'catholic_hub' && <CatholicKnowledgeHub />}
            {activeTab === 'liturgical_planner' && (
              guard.canAccess('choir_member') ? (
                <LiturgicalPlanner />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
            {activeTab === 'rehearsals' && (
              guard.canAccess('choir_member') ? (
                <RehearsalManager
                  rehearsals={rehearsals}
                  members={members}
                  isAdmin={guard.isAdmin}
                  onAddRehearsal={(r) => void rehearsalSync.upsert({ ...r, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid)}
                  onUpdateRehearsal={(r) => void rehearsalSync.upsert({ ...r, ...createRecordMetadata(authState.user?.uid ?? 'admin', 'active', tenantContext) }, authState.user?.uid)}
                  onMarkAttendance={(_rec: AttendanceRecord) => { /* TODO: persist to attendance collection */ }}
                />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
            {activeTab === 'gamification' && (
              guard.canAccess('choir_member') ? (
                currentMember ? (
                  <GamificationProfileView member={currentMember} allMembers={members} />
                ) : <ModuleSkeleton />
              ) : <AccessDenied requiredRole="choir_member" />
            )}
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav — 5 primary tabs + More drawer */}
      {mobileMoreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 rounded-t-2xl border-t border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">More</span>
              <button onClick={() => setMobileMoreOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3">
              {([
                { id: 'bible' as Tab,             Icon: BookText,       label: 'Bible' },
                { id: 'catholic_hub' as Tab,       Icon: BookOpen,       label: 'Catholic' },
                { id: 'rehearsals' as Tab,         Icon: Sparkles,       label: 'Rehearsals' },
                { id: 'dashboard_member' as Tab,   Icon: HeartHandshake, label: 'Ministry' },
                { id: 'liturgical_planner' as Tab, Icon: Star,           label: 'Planner' },
                { id: 'ai_hub' as Tab,             Icon: Command,        label: 'AI Hub' },
                { id: 'analytics' as Tab,          Icon: BarChart3,      label: 'Insights' },
              ] as { id: Tab; Icon: React.ElementType; label: string }[])
                .filter(({ id }) => guard.canAccess(TAB_REQUIRED_ROLE[id]))
                .map(({ id, Icon, label }) => {
                  const isActive = activeTab === id;
                  return (
                    <button key={id} onClick={() => { navigate(id); setMobileMoreOpen(false); }}
                      className={'flex flex-col items-center gap-1 rounded-xl p-3 min-h-[64px] ' + (isActive ? 'bg-[#18392f]/10' : 'hover:bg-slate-50')}>
                      <Icon className={'h-5 w-5 ' + (isActive ? 'text-[#18392f]' : 'text-slate-500')} />
                      <span className={'text-[9px] font-bold ' + (isActive ? 'text-[#18392f]' : 'text-slate-500')}>{label}</span>
                    </button>
                  );
                })}
            </div>
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'landing' as Tab,      Icon: LayoutDashboard, label: 'Home' },
          { id: 'calendar' as Tab,     Icon: CalendarDays,    label: 'Calendar' },
          { id: 'masses' as Tab,       Icon: Church,          label: 'Masses' },
          { id: 'song_library' as Tab, Icon: Music2,          label: 'Songs' },
          { id: 'registration' as Tab, Icon: UsersRound,      label: 'People' },
        ] as { id: Tab; Icon: React.ElementType; label: string }[])
          .filter(({ id }) => guard.canAccess(TAB_REQUIRED_ROLE[id]))
          .map(({ id, Icon, label }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} onClick={() => navigate(id)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 min-h-[56px]"
                aria-current={isActive ? 'page' : undefined}>
                <Icon className={'h-5 w-5 ' + (isActive ? 'text-[#18392f]' : 'text-slate-400')} />
                <span className={'text-[9px] font-bold ' + (isActive ? 'text-[#18392f]' : 'text-slate-400')}>{label}</span>
              </button>
            );
          })}
        {/* More button */}
        <button onClick={() => setMobileMoreOpen((o) => !o)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 min-h-[56px]">
          <Menu className={'h-5 w-5 ' + (mobileMoreOpen ? 'text-[#18392f]' : 'text-slate-400')} />
          <span className={'text-[9px] font-bold ' + (mobileMoreOpen ? 'text-[#18392f]' : 'text-slate-400')}>More</span>
        </button>
      </nav>
      <div className="h-[calc(56px+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </div>
    </>
  );
}

// =============================================================================
// App — root export. Wraps AppInner in ParishProvider so useParish() works.
// =============================================================================
export default function App() {
  return (
    <ParishProvider>
      <AppInner />
    </ParishProvider>
  );
}
