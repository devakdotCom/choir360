import React, { useState } from 'react';
import { Mass, ChoirEvent, Language, EventCategory } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  Check,
  PlusCircle,
  Award,
  Sparkles
} from 'lucide-react';
import { INDIAN_RC_HOLIDAYS_2026, MULTILINGUAL_DICTIONARY } from '../data/mockData';

interface UnifiedCalendarProps {
  currentLang: Language;
  masses: Mass[];
  events: ChoirEvent[];
  onAddEvent: (evt: ChoirEvent) => void;
}

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  currentLang,
  masses,
  events,
  onAddEvent
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // Calendar toggle states
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(5); // June 2026 representation
  const [currentDayStr, setCurrentDayStr] = useState('25'); // selected June date

  // Event overlay
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>('Choir Practice');
  const [newEventDate, setNewEventDate] = useState('2026-06-25');
  const [newEventTime, setNewEventTime] = useState('06:00 PM');
  const [newEventLocation, setNewEventLocation] = useState('Saint Thomas Cathedral choirloft');
  const [addMsg, setAddMsg] = useState('');

  const months = [
    'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
    'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  const daysInJune = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0'));

  // Liturgical days list
  const calendarItemsForJune = [
    { day: '02', season: 'Ordinary', detail: 'Arokia Marriage Mass booking' },
    { day: '07', season: 'Feast', detail: 'Corpus Christi Solemn Eucharistic Procession' },
    { day: '14', season: 'Ordinary', detail: 'Sunday Ordinary Mass Choral' },
    { day: '21', season: 'Ordinary', detail: 'Father\'s Day Liturgical Thanksgiving' },
    { day: '24', season: 'Feast', detail: 'Birth of Saint John the Baptist Solemnity' },
    { day: '28', season: 'Feast', detail: 'Sts. Peter & Paul Solemn Feast' },
    { day: '29', season: 'Ordinary', detail: 'Parish Choir Council Quarterly Audit' }
  ];

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName) return;

    const newEvt: ChoirEvent = {
      id: `EV${String(events.length + 1).padStart(3, '0')}`,
      name: newEventName,
      category: newEventCategory,
      date: newEventDate,
      time: newEventTime,
      location: newEventLocation,
      description: "Soprano & Tenors presence requested for four-part rehearsals.",
      bannerUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400",
      rsvps: {}
    };

    onAddEvent(newEvt);
    setNewEventName('');
    setAddMsg(`Successfully logged choir event: ${newEvt.name}`);
    setTimeout(() => setAddMsg(''), 4000);
  };

  const handleSyncCalendar = (platform: string) => {
    alert(`Establishing secure synchronization with ${platform} Calendar...\n\nSyncing ${events.length} upcoming Choral rehearsals and ${masses.length} Liturgical parish services.\n\nChoir360 background pipelines are active!`);
  };

  return (
    <div className="space-y-8 text-slate-800" id="unified-calendar-container">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600 animate-pulse" />
          <div>
            <h2 className="font-sans font-bold text-xl text-slate-850">{dict.calendarTitle}</h2>
            <p className="text-xs text-slate-500">Universal diocesan calendar integration and Google/Outlook sync links</p>
          </div>
        </div>

        {/* View selector and sync tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sync prompts */}
          <button
            onClick={() => handleSyncCalendar('Google')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1 transition"
          >
            <ExternalLink className="w-3 h-3 text-emerald-600" />
            Sync Google Calendar
          </button>
          
          <button
            onClick={() => handleSyncCalendar('Outlook')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1 transition"
          >
            <ExternalLink className="w-3 h-3 text-sky-600" />
            Sync Outlook
          </button>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['month', 'week', 'day'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md capitalize transition cursor-pointer ${
                  currentView === view ? 'bg-white text-slate-805 shadow-xs' : 'text-slate-500 hover:text-slate-805'
                }`}
              >
                {view} View
              </button>
            ))}
          </div>
        </div>
      </div>

      {addMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-805 border border-emerald-200 rounded-xl text-xs font-semibold">
          {addMsg}
        </div>
      )}

      {/* 2. Main structure: grid for calendar visual & side planner list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Calendar visual card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6" id="calendar-visual-grid-box">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              {months[currentMonthIndex]}
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-100">
                Ordinary Season
              </span>
            </h3>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonthIndex(idx => Math.max(0, idx - 1))}
                className="p-1 text-slate-600 hover:bg-slate-50 rounded border border-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonthIndex(idx => Math.min(11, idx + 1))}
                className="p-1 text-slate-600 hover:bg-slate-50 rounded border border-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Monthly view Grid representation */}
          {currentView === 'month' && (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Pad Monday start day */}
                <div className="p-3 bg-slate-50 border border-slate-100 text-slate-300 rounded-xl text-center h-20 text-[10px]" />
                
                {daysInJune.map((dayNum) => {
                  const correspondingCalItem = calendarItemsForJune.find(item => item.day === dayNum);
                  const isToday = dayNum === currentDayStr;

                  // Set season-based style modifiers
                  let seasonalClass = 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-700';
                  if (correspondingCalItem) {
                    if (correspondingCalItem.season === 'Ordinary') {
                      seasonalClass = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-150';
                    } else if (correspondingCalItem.season === 'Feast') {
                      seasonalClass = 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-150';
                    }
                  }

                  if (isToday) {
                    seasonalClass = 'ring-2 ring-emerald-600 bg-slate-50';
                  }

                  return (
                    <div
                      key={dayNum}
                      onClick={() => setCurrentDayStr(dayNum)}
                      className={`p-2.5 rounded-xl text-center h-20 flex flex-col justify-between transition cursor-pointer ${seasonalClass}`}
                    >
                      <span className="font-mono text-xs font-bold block text-left">{dayNum}</span>
                      
                      {correspondingCalItem ? (
                        <span className="text-[8px] font-bold tracking-tight truncate line-clamp-2 leading-tight block text-left bg-emerald-600/10 p-0.5 rounded">
                          {correspondingCalItem.detail}
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-400 block text-left">Practice loft</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week/Day placeholder lists */}
          {(currentView === 'week' || currentView === 'day') && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100" id="weekly-agenda-viewer">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled items for June {currentDayStr}, 2026</h4>
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">Wedding Mass (Susairaj & Susheela)</h5>
                    <p className="text-[10px] text-slate-400 font-mono">07:00 AM • Saint Michael Choir balcony</p>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 font-bold rounded text-[9px] uppercase">Rites</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">Soprano Vocal Tuning rehearsal</h5>
                    <p className="text-[10px] text-slate-400 font-mono">06:00 PM • Saint Thomas loft balcony</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded text-[9px] uppercase">Choir practice</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Scheduler Add Form & Diocese Holidays card */}
        <div className="space-y-6" id="planner-form-card">
          
          {/* HOLIDAYS OF THE DIOCESE */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl border border-slate-850 space-y-3">
            <h4 className="font-sans font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-5 h-5" />
              Diocese Marian Feasts
            </h4>
            <div className="divide-y divide-slate-800 space-y-2 text-xs">
              {INDIAN_RC_HOLIDAYS_2026.map((h, i) => (
                <div key={i} className="pt-2 flex justify-between items-center bg-slate-950/20 p-2 rounded">
                  <div>
                    <p className="font-bold text-white">{h.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">Holiday Mode • {h.date}</p>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-950 border border-amber-800 text-amber-400 rounded-md font-bold">
                    FEAST
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ADMIN CONSOLE: LOG EVENT REHEARSALS (ROLE DESKTOP) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4" id="rehearsal-creator">
            <h4 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Log Choral Event / Rehearsal
            </h4>
            
            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs" id="calendar-event-form">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Event Title / Purpose</label>
                <input
                  type="text"
                  required
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  placeholder="e.g. Marian Devotional Alto Rehearsal"
                  className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Liturgical Date</label>
                  <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-1.5 border border-slate-200 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Vibe Category</label>
                  <select
                    value={newEventCategory}
                    onChange={e => setNewEventCategory(e.target.value as EventCategory)}
                    className="w-full p-1.5 border border-slate-200 rounded"
                  >
                    <option value="Choir Practice">Choir Practice (Practice)</option>
                    <option value="Feast">Feast Day Masses</option>
                    <option value="Retreat">Retreat Preparation</option>
                    <option value="Parish Event">Parish General Assembly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Location / Rehearsal Venue</label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={e => setNewEventLocation(e.target.value)}
                  className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded"
                />
              </div>

              <button
                type="submit"
                id="create-event-btn"
                className="w-full py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition"
              >
                Log Choral Session
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
