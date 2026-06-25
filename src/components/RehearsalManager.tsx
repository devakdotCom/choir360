import React, { useState, useMemo } from 'react';
import {
  Music2, Plus, Calendar, Clock, MapPin, Users, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Pencil, X, BookOpen,
} from 'lucide-react';
import { Rehearsal, RehearsalType, Member, AttendanceRecord } from '../types';

const REHEARSAL_TYPES: RehearsalType[] = [
  'Regular Practice',
  'Pre-Sunday Practice',
  'Feast Preparation',
  'New Song Workshop',
  'Special Preparation',
  'Sectional Practice',
];

const STATUS_COLORS: Record<Rehearsal['status'], string> = {
  Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled:  'bg-rose-50 text-rose-700 border-rose-200',
};

interface RehearsalManagerProps {
  rehearsals: Rehearsal[];
  members: Member[];
  isAdmin: boolean;
  onAddRehearsal: (r: Rehearsal) => void;
  onUpdateRehearsal: (r: Rehearsal) => void;
  onMarkAttendance: (record: AttendanceRecord) => void;
}

const newId = () => `rehearsal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const RehearsalManager: React.FC<RehearsalManagerProps> = ({
  rehearsals, members, isAdmin, onAddRehearsal, onUpdateRehearsal, onMarkAttendance,
}) => {
  const today = new Date().toISOString().slice(0, 10);

  const [showForm, setShowForm]             = useState(false);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState<string | null>(null);
  const [filter, setFilter]                 = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  // Form state
  const [name, setName]             = useState('Choir Practice');
  const [type, setType]             = useState<RehearsalType>('Regular Practice');
  const [date, setDate]             = useState(today);
  const [start, setStart]           = useState('18:00');
  const [end, setEnd]               = useState('19:30');
  const [venue, setVenue]           = useState('Church Hall');
  const [conductor, setConductor]   = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  const sorted = useMemo(() => {
    const list = [...rehearsals].sort((a, b) => a.date < b.date ? 1 : -1);
    if (filter === 'upcoming')  return list.filter(r => r.date >= today && r.status !== 'Cancelled');
    if (filter === 'completed') return list.filter(r => r.status === 'Completed');
    return list;
  }, [rehearsals, filter, today]);

  const activeMembers = useMemo(
    () => members.filter(m => m.status === 'Active Member' || m.status === 'Approved'),
    [members],
  );

  const handleAdd = async () => {
    if (!name || !date) return;
    setSaving(true);
    const rehearsal: Rehearsal = {
      id: newId(), name, type, date,
      startTime: start, endTime: end,
      venue, conductor, notes,
      status: 'Scheduled',
      attendingMemberIds: [],
    };
    onAddRehearsal(rehearsal);
    // reset form
    setName('Choir Practice'); setType('Regular Practice'); setDate(today);
    setStart('18:00'); setEnd('19:30'); setVenue('Church Hall');
    setConductor(''); setNotes('');
    setShowForm(false);
    setSaving(false);
  };

  const toggleAttend = (rehearsalId: string, memberId: string, memberName: string, attending: boolean) => {
    const rehearsal = rehearsals.find(r => r.id === rehearsalId);
    if (!rehearsal) return;
    const currentIds = rehearsal.attendingMemberIds ?? [];
    const newIds = attending
      ? [...currentIds, memberId]
      : currentIds.filter(id => id !== memberId);
    onUpdateRehearsal({ ...rehearsal, attendingMemberIds: newIds });
    onMarkAttendance({
      id: `att-${rehearsalId}-${memberId}`,
      entityId: rehearsalId,
      entityType: 'Rehearsal',
      entityName: rehearsal.name,
      date: rehearsal.date,
      memberId,
      memberName,
      status: attending ? 'Present' : 'Absent',
    });
  };

  const markComplete = (r: Rehearsal) => {
    onUpdateRehearsal({ ...r, status: 'Completed' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rehearsals</h2>
          <p className="text-xs text-slate-500 mt-0.5">{rehearsals.length} total · {rehearsals.filter(r=>r.status==='Scheduled').length} scheduled</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 rounded-xl bg-[#18392f] px-4 py-2.5 text-xs font-bold text-white min-h-[44px]">
            <Plus className="h-4 w-4 text-amber-300" />
            Schedule Rehearsal
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">New Rehearsal</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
              <select value={type} onChange={e => setType(e.target.value as RehearsalType)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400">
                {REHEARSAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start</label>
                <input type="time" value={start} onChange={e => setStart(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">End</label>
                <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Venue</label>
              <input value={venue} onChange={e => setVenue(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Conductor</label>
              <input value={conductor} onChange={e => setConductor(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Notes / Songs to Practice</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none" />
          </div>
          <button onClick={handleAdd} disabled={saving || !name || !date}
            className="w-full rounded-xl bg-[#18392f] py-2.5 text-sm font-bold text-white disabled:opacity-50 min-h-[44px]">
            {saving ? 'Saving…' : 'Schedule Rehearsal'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {(['upcoming', 'completed', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${filter === f ? 'bg-[#18392f] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Rehearsal cards */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Music2 className="mx-auto h-8 w-8 text-slate-300"/>
          <p className="mt-3 text-sm font-semibold text-slate-500">No rehearsals found</p>
          {isAdmin && <p className="text-xs text-slate-400 mt-1">Click "Schedule Rehearsal" to add one.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(r => {
            const isExpanded  = expandedId === r.id;
            const showAtt     = attendanceOpen === r.id;
            const attendCount = (r.attendingMemberIds ?? []).length;

            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <Music2 className="h-5 w-5 text-emerald-700"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{r.type}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{r.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{r.startTime}–{r.endTime}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{r.venue}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{attendCount} attending</span>
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-3">
                    {r.conductor && <p className="text-xs text-slate-600"><strong>Conductor:</strong> {r.conductor}</p>}
                    {r.notes && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs text-amber-800 flex items-start gap-2">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5"/>
                          {r.notes}
                        </p>
                      </div>
                    )}
                    {/* Admin actions */}
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setAttendanceOpen(showAtt ? null : r.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]">
                          <Users className="h-3.5 w-3.5"/> Mark Attendance
                        </button>
                        {r.status === 'Scheduled' && (
                          <button onClick={() => markComplete(r)}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 min-h-[36px]">
                            <CheckCircle2 className="h-3.5 w-3.5"/> Mark Completed
                          </button>
                        )}
                        <button onClick={() => onUpdateRehearsal({ ...r, status: 'Cancelled' })}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 min-h-[36px]">
                          <XCircle className="h-3.5 w-3.5"/> Cancel
                        </button>
                      </div>
                    )}

                    {/* Attendance panel */}
                    {showAtt && (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                          Attendance — {r.date}
                        </div>
                        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          {activeMembers.map(m => {
                            const attending = (r.attendingMemberIds ?? []).includes(m.id);
                            return (
                              <div key={m.id} className="flex items-center justify-between px-3 py-2">
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                                  <p className="text-[10px] text-slate-400">{m.voiceType} · {m.memberType}</p>
                                </div>
                                <button onClick={() => toggleAttend(r.id, m.id, `${m.firstName} ${m.lastName}`, !attending)}
                                  className={`rounded-full px-3 py-1 text-[10px] font-bold transition min-h-[32px] ${attending ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {attending ? '✓ Present' : '✗ Absent'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
