import React, { useState } from 'react';
import { Member, Language, ChoirEvent, Mass } from '../types';
import {
  User,
  Activity,
  DollarSign,
  CalendarDays,
  CheckCircle,
  AlertOctagon,
  Calendar,
  AlertCircle,
  Heart,
  Save,
  MessageSquare,
  Sliders,
  Volume2,
  Play,
  Pause,
  Award,
  Sparkles,
  Camera,
  ThumbsUp,
  Check,
  Music,
  IdCard,
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { DigitalChoirID } from './DigitalChoirID';

interface DashboardMemberProps {
  currentLang: Language;
  memberId: string; // The logged-in member context (e.g. "M001")
  members: Member[];
  events: ChoirEvent[];
  masses: Mass[];
  onUpdateMemberDetails: (updated: Member) => void;
  onUpdateEventRsvp: (eventId: string, memberId: string, status: 'Going' | 'Not Going' | 'Maybe') => void;
}

export const DashboardMember: React.FC<DashboardMemberProps> = ({
  currentLang,
  memberId,
  members,
  events,
  masses,
  onUpdateMemberDetails,
  onUpdateEventRsvp
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // Find current member
  const member = members.find(m => m.id === memberId) || members[0];

  // Dashboard sub-tab
  const [dashTab, setDashTab] = useState<'overview' | 'id_card'>('overview');

  // Component local states
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState(member.firstName);
  const [editLastName, setEditLastName] = useState(member.lastName);
  const [editMobile, setEditMobile] = useState(member.mobile);
  const [editWhatsapp, setEditWhatsapp] = useState(member.whatsapp);
  const [editEmail, setEditEmail] = useState(member.email);
  const [editAddress, setEditAddress] = useState(member.address);
  const [editSkills, setEditSkills] = useState(member.skills);

  // Profile change simulation status
  const [hasRequestedChange, setHasRequestedChange] = useState(false);

  // Availability control
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailReason, setUnavailReason] = useState('');
  const [availSavedMsg, setAvailSavedMsg] = useState('');

  // Save edit requests
  const handleEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMember: Member = {
      ...member,
      firstName: editFirstName,
      lastName: editLastName,
      mobile: editMobile,
      whatsapp: editWhatsapp,
      email: editEmail,
      address: editAddress,
      skills: editSkills,
    };
    onUpdateMemberDetails(updatedMember);
    setIsEditing(false);
    setHasRequestedChange(true);
    setTimeout(() => {
      setHasRequestedChange(false);
    }, 6000);
  };

  // Save Availability
  const handleAvailabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable && !unavailReason.trim()) {
      alert("Please provide the reason why you are unavailable.");
      return;
    }
    setAvailSavedMsg(`Your availability for the upcoming Solemn Feast liturgies has been locked into the AI Schedule Optimizer roster! (${isAvailable ? 'Available' : 'Unavailable: ' + unavailReason})`);
    setTimeout(() => setAvailSavedMsg(''), 6000);
  };

  // Mock earnings for this member
  const mockEarnings = [
    { id: 'E01', name: 'Thanksgiving Solemn feast mass', date: '2026-06-28', amount: 10000, share: 1000, status: 'Approved' },
    { id: 'E02', name: 'Marriage Mass booking (Arokia/Mary)', date: '2026-06-02', amount: 8000, share: 900, status: 'Disbursed' },
    { id: 'E03', name: 'First Holy Communion high ceremony', date: '2026-05-18', amount: 12000, share: 1200, status: 'Disbursed' }
  ];

  // --- Rehearsal Isolation and Practice Deck states ---
  const [isPlayingPractice, setIsPlayingPractice] = useState(false);
  const [sopranoVol, setSopranoVol] = useState(85);
  const [altoVol, setAltoVol] = useState(70);
  const [tenorVol, setTenorVol] = useState(40);
  const [bassVol, setBassVol] = useState(90);
  const [organVol, setOrganVol] = useState(60);
  const [tempoBpm, setTempoBpm] = useState(96);
  const [isRecordActive, setIsRecordActive] = useState(false);
  const [pitchAccuracy, setPitchAccuracy] = useState<number | null>(null);
  const [pitchMatches, setPitchMatches] = useState<string>('');

  // --- Social Forum Feed States ---
  const [prayers, setPrayers] = useState([
    { id: 1, author: "Amal Joseph (Choir Organist)", text: "Please pray for our upcoming Diocese Choral Festival competition in Madurai next Sunday. We want our 4-part harmony to be clean and unified!", category: "Choir Intention", prays: 14, userPrayed: false },
    { id: 2, author: "Sister Mary Teresa", text: "Special thanksgiving intention for the marriage of Dr. Jo Joseph, our veteran soprano leader. Praying for their newly married couple life.", category: "Thanksgiving", prays: 28, userPrayed: true },
    { id: 3, author: "Rev. Father Susairaj", text: "Pray for the musical health and vocal persistence of all Choir elements in South Tamil Nadu, Thoothukudi parish.", category: "General Intent", prays: 41, userPrayed: false },
  ]);
  const [newPrayerText, setNewPrayerText] = useState("");
  const [successPost, setSuccessPost] = useState("");

  const handlePostPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayerText.trim()) return;
    const added = {
      id: prayers.length + 1,
      author: `${member.firstName} ${member.lastName} (${member.voiceType} Cantor)`,
      text: newPrayerText,
      category: "Personal Intention",
      prays: 0,
      userPrayed: false
    };
    setPrayers([added, ...prayers]);
    setNewPrayerText("");
    setSuccessPost("Prayer request posted to the Parish Choir prayer wall!");
    setTimeout(() => setSuccessPost(""), 4000);
  };

  const handleIncrementPray = (id: number) => {
    setPrayers(prayers.map(p => {
      if (p.id === id) {
        return {
          ...p,
          prays: p.userPrayed ? p.prays - 1 : p.prays + 1,
          userPrayed: !p.userPrayed
        };
      }
      return p;
    }));
  };

  const triggerRecordAndAnalyze = () => {
    setIsRecordActive(true);
    setPitchAccuracy(null);
    setPitchMatches("Listening to Cantor vocal register mic entry...");
    setTimeout(() => {
      const mockAcc = Math.floor(Math.random() * 15) + 84; // 84 to 98%
      setPitchAccuracy(mockAcc);
      setIsRecordActive(false);
      setPitchMatches(`Acoustics Analyzed! Freq Match: ${mockAcc >= 95 ? 'A4 440Hz' : 'A4 438Hz'}. Deviation: ${100 - mockAcc} cents. Breath balance: Steady & Ideal! Excellent support.`);
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="member-dashboard-subcontainer">

      {/* Sub-tab switcher */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setDashTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition ${
            dashTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Overview
        </button>
        <button
          onClick={() => setDashTab('id_card')}
          className={`flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition ${
            dashTab === 'id_card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <IdCard className="w-3.5 h-3.5" /> Digital ID & Badges
        </button>
      </div>

      {/* Digital Choir ID tab */}
      {dashTab === 'id_card' && (
        <DigitalChoirID
          member={member}
          onCheckIn={(memberId, payload) => {
            console.log('[Choir360] QR Check-in', memberId, payload);
          }}
        />
      )}

      {/* Overview tab content */}
      {dashTab === 'overview' && <>

      {/* Header Summary */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-6" id="dashboard-member-header">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <img
            src={member.photoUrl}
            alt={member.firstName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
          />
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-lg flex items-center justify-center md:justify-start gap-1.5">
              {member.firstName} {member.lastName}
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200">
                {member.status}
              </span>
            </h3>
            <p className="text-xs text-slate-500">{member.memberType} Choralist • Vocal voice: <strong className="text-emerald-700">{member.voiceType}</strong></p>
            <p className="text-[10px] font-mono text-slate-400">ID: {member.id} • Registered under {member.parish}</p>
          </div>
        </div>

        {/* Attendance Percentage Circle */}
        <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-emerald-800 tracking-tight">{member.attendanceRate || 92}%</p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Attendance %</p>
          </div>
          <div className="text-xs text-slate-600 border-l border-emerald-200 pl-3 space-y-0.5">
            <p>Present: <span className="font-semibold text-emerald-800">12 Masses</span></p>
            <p>Late: <span className="font-semibold text-amber-700">2 Masses</span></p>
            <p>Absent: <span className="font-semibold text-rose-700">1 Mass</span></p>
          </div>
        </div>
      </div>

      {hasRequestedChange && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs font-medium flex items-center gap-2" id="edit-request-banner">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
          <span>
            Profile update request submitted. Local administrators (Choir Admin / Super Admin) have received the notification to verify and publish changes.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile edit & Availability RSVPs */}
        <div className="space-y-8" id="member-profile-controls">
          
          {/* PROFILE MODULE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="member-profile-card">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                My Profile Details
              </h4>
              <button
                id="edit-profile-btn"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                {isEditing ? 'Cancel Edit' : 'Request Update'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleEditRequest} className="space-y-4 text-xs" id="profile-edit-form">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">First Name</label>
                    <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Last Name</label>
                    <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input type="text" value={editMobile} onChange={e => setEditMobile(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp Number</label>
                  <input type="text" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Residential Address</label>
                  <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full p-2 border border-slate-200 rounded h-16" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Special Skills</label>
                  <input type="text" value={editSkills} onChange={e => setEditSkills(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
                </div>
                <button
                  type="submit"
                  id="save-profile-request-btn"
                  className="w-full py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Submit Edit for Admin Approval
                </button>
              </form>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-600" id="profile-read-only">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Department</span>
                  <span className="font-semibold text-slate-800">{member.memberType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Primary Register</span>
                  <span className="font-semibold text-emerald-800 font-sans">{member.voiceType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Mobile Phone</span>
                  <span className="font-semibold text-slate-800">{member.mobile}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">WhatsApp</span>
                  <span className="font-semibold text-slate-800">{member.whatsapp}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Parish</span>
                  <span className="font-semibold text-slate-800 text-right max-w-44 truncate">{member.parish}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Skills Profile</span>
                  <span className="font-semibold text-slate-800 italic leading-snug">{member.skills || 'Choralist'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Joined Choir</span>
                  <span className="font-mono font-medium text-slate-800">{member.joiningDate || '2021'}</span>
                </div>
              </div>
            )}
          </div>

          {/* MY AVAILABILITY STATUS (MANDATORY REASON IF UNAVAILABLE) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="member-availability-card">
            <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              {dict.availability}
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              State your availability for upcoming Sunday and Wednesday Solemn Feast Masses so the scheduler optimizer can balance our vocals.
            </p>

            {availSavedMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-medium leading-relaxed">
                {availSavedMsg}
              </div>
            )}

            <form onSubmit={handleAvailabilitySubmit} className="space-y-4 text-xs" id="availability-form">
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 justify-between">
                <span className="font-semibold text-slate-700">Are you available?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsAvailable(true); setUnavailReason(''); }}
                    className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition ${
                      isAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    Yes, Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition ${
                      !isAvailable ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    No, Unavailable
                  </button>
                </div>
              </div>

              {!isAvailable && (
                <div className="space-y-1.5 animate-slide-up" id="unavail-reason-input-group">
                  <label className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    State Reason (Mandatory) *
                  </label>
                  <input
                    type="text"
                    value={unavailReason}
                    onChange={e => setUnavailReason(e.target.value)}
                    placeholder="e.g. Travel, parish coordinator duty, medical..."
                    className="w-full p-2.5 text-xs rounded-lg border border-rose-200 bg-rose-50/20 focus:ring-1 focus:ring-rose-500 font-medium"
                    required={!isAvailable}
                  />
                </div>
              )}

              <button
                type="submit"
                id="save-availability-btn"
                className="w-full py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-1 transition shadow-xs"
              >
                Update My Availability
              </button>
            </form>
          </div>

          {/* GAMIFICATION ACHIEVEMENTS & BADGES MODULE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="member-gamification-card">
            <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-50">
              <Award className="w-4 h-4 text-amber-500" />
              My Choral Badges & Level
            </h4>
            
            {/* Level status */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Cantor status: <span className="text-emerald-700">Level 4</span></span>
                <span className="text-[10px] text-slate-400 font-mono">2,450 / 3,000 XP</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '81%' }} />
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Earn 550 XP from upcoming rehearsals or translations to level-up to <strong>Choral Director (Level 5)</strong>!
              </p>
            </div>

            {/* Badges list */}
            <div className="grid grid-cols-2 gap-3" id="badges-grid-case">
              <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-center space-y-1 hover:shadow-2xs transition duration-200">
                <div className="text-xl">👑</div>
                <p className="text-[10px] font-bold text-slate-800">Perfect Attendance</p>
                <p className="text-[9px] text-slate-400">Ordinary Season</p>
              </div>

              <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl text-center space-y-1 hover:shadow-2xs transition duration-200">
                <div className="text-xl">🎵</div>
                <p className="text-[10px] font-bold text-slate-800">Music Master</p>
                <p className="text-[9px] text-slate-400">Transliteration</p>
              </div>

              <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-center space-y-1 hover:shadow-2xs transition duration-200">
                <div className="text-xl">🤝</div>
                <p className="text-[10px] font-bold text-slate-800">Service Veteran</p>
                <p className="text-[9px] text-slate-400">10 Wedding Masses</p>
              </div>

              <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-xl text-center space-y-1 hover:shadow-2xs transition duration-200">
                <div className="text-xl">🌟</div>
                <p className="text-[10px] font-bold text-slate-800">Vocal Pillar</p>
                <p className="text-[9px] text-slate-400">Soprano High Spec</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle and Right: Mass Earnings and RSVPs */}
        <div className="lg:col-span-2 space-y-8" id="member-earnings-events">
          
          {/* EARNINGS LEDGER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" id="member-earnings-card">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                {dict.earnings}
              </h4>
              <span className="text-xs text-slate-400 font-mono">Disbursed via Church Bank Portal</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left" id="member-earnings-table">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-semibold uppercase">
                    <th className="py-2.5">Mass Name</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5 text-right">Total Offer</th>
                    <th className="py-2.5 text-right text-emerald-700">My Share Share</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {mockEarnings.map((earn) => (
                    <tr key={earn.id}>
                      <td className="py-3.5 font-bold text-slate-800">{earn.name}</td>
                      <td className="py-3.5 text-slate-500 font-mono">{earn.date}</td>
                      <td className="py-3.5 text-right text-slate-600 font-mono">₹{earn.amount.toLocaleString()}</td>
                      <td className="py-3.5 text-right text-emerald-700 font-bold font-mono">₹{earn.share.toLocaleString()}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          earn.status === 'Disbursed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {earn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Share summary rule */}
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td className="py-3 px-2 text-slate-700" colSpan={3}>Aggregate Personal Income</td>
                    <td className="py-3 text-right text-emerald-800 font-extrabold font-mono text-xs">
                      ₹{(mockEarnings.reduce((acc, curr) => acc + curr.share, 0))}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-slate-50/50 border border-slate-200/60 text-[10px] text-slate-500 leading-relaxed font-sans">
              <strong>Calculation Rules:</strong> Instrumentalist roles receive double share weighting (Weight = 2) for church services, and vocal singers receive single share weighting (Weight = 1) automatically based on the locked payment registries.
            </div>
          </div>

          {/* MY EVENTS RSVP LEDGER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" id="member-rsvp-card">
            <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              My Scheduled Choral Events & RSVPs
            </h4>

            <div className="space-y-4">
              {events.slice(0, 3).map((evt) => {
                const currentRsvp = evt.rsvps[memberId] || 'Maybe';
                return (
                  <div key={evt.id} className="p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-100 rounded text-[9px] font-bold uppercase">
                          {evt.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{evt.time}</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800">{evt.name}</h5>
                      <p className="text-[10px] text-slate-500 font-mono">{evt.date} • {evt.location}</p>
                    </div>

                    {/* RSVP Buttons */}
                    <div className="flex items-center gap-1">
                      {(['Going', 'Not Going', 'Maybe'] as const).map((status) => {
                        const isCurrent = currentRsvp === status;
                        return (
                          <button
                            key={status}
                            onClick={() => onUpdateEventRsvp(evt.id, memberId, status)}
                            className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                              isCurrent
                                ? status === 'Going' ? 'bg-emerald-600 text-white shadow-xs' :
                                  status === 'Not Going' ? 'bg-rose-600 text-white shadow-xs' :
                                  'bg-slate-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {status === 'Going' ? dict.rs_going : status === 'Not Going' ? dict.rs_notgoing : dict.rs_maybe}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REHEARSAL ISOLATION PRACTICE PLAYBACK HUB */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-md border border-slate-800 space-y-5 shadow-xs" id="member-practice-isolation-card">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="font-sans font-bold text-white text-sm flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                Vocal Register Rehearsal & Isolation Console
              </h4>
              <span className="text-[9px] bg-slate-800 font-mono text-emerald-400 px-2 py-0.5 rounded-full uppercase border border-slate-700">
                OFFLINE CACHED
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Practice upcoming feast scores. Drag individual sliders to isolate each register voice dynamically, adjust the tempo, or record your voice.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Isolation Sliders */}
              <div className="space-y-3.5" id="register-sliders">
                <h5 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Register Balance Mixer</h5>
                
                {/* Soprano Voice */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-350">Soprano (Melodic Voice)</span>
                    <span className="font-mono text-emerald-400">{sopranoVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={sopranoVol} onChange={e => setSopranoVol(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                {/* Alto Voice */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-350">Alto (Harmony Mid)</span>
                    <span className="font-mono text-blue-400">{altoVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={altoVol} onChange={e => setAltoVol(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>

                {/* Tenor Voice */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-350">Tenor (Tenor Lead Harmony)</span>
                    <span className="font-mono text-amber-400">{tenorVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={tenorVol} onChange={e => setTenorVol(Number(e.target.value))} className="w-full accent-amber-500" />
                </div>

                {/* Bass Voice */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-350">Bass (Fundamental Acoustic)</span>
                    <span className="font-mono text-purple-400">{bassVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={bassVol} onChange={e => setBassVol(Number(e.target.value))} className="w-full accent-purple-500" />
                </div>

                {/* Organ / Synthesizer */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-305">Church Organ Guide</span>
                    <span className="font-mono text-slate-400">{organVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={organVol} onChange={e => setOrganVol(Number(e.target.value))} className="w-full accent-slate-400" />
                </div>
              </div>

              {/* Player State & Recording test */}
              <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-800 flex flex-col justify-between" id="player-calibration">
                <div className="space-y-2">
                  <h5 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Practice Deck Console</h5>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlayingPractice(!isPlayingPractice)}
                      className={`p-3 rounded-full text-white cursor-pointer transition ${
                        isPlayingPractice ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {isPlayingPractice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div>
                      <h6 className="text-xs font-bold font-sans">Imported PDF Songbook (Roster Rehearsal)</h6>
                      <p className="text-[9px] text-slate-400 font-mono">Key: Em • Tempo: {tempoBpm} BPM</p>
                    </div>
                  </div>

                  {/* Tempo slider */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                      <span>Tempo (BPM)</span>
                      <span className="font-mono text-white">{tempoBpm} BPM</span>
                    </div>
                    <input type="range" min="60" max="150" value={tempoBpm} onChange={e => setTempoBpm(Number(e.target.value))} className="w-full accent-emerald-505" />
                  </div>
                </div>

                {/* Audio record & analysis */}
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750 text-[11px] space-y-2">
                  <div className="flex justify-between items-center bg-slate-900 pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Pitch Trainer</span>
                    <button
                      type="button"
                      onClick={triggerRecordAndAnalyze}
                      disabled={isRecordActive}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] disabled:opacity-40 cursor-pointer"
                    >
                      {isRecordActive ? "Analyzing..." : "Record & Test"}
                    </button>
                  </div>
                  {pitchMatches && (
                    <p className="text-[10px] text-emerald-410 leading-relaxed font-mono">
                      {pitchMatches}
                    </p>
                  )}
                  {pitchAccuracy !== null && (
                    <div className="flex justify-between items-center border-t border-slate-800/80 pt-1 text-[10px]">
                      <span className="text-slate-400">Vocal Register Pitch Alignment:</span>
                      <span className="font-mono font-bold text-white text-[11px]">
                        {pitchAccuracy}% Match {pitchAccuracy >= 94 ? "🏆" : "👍"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COMMUNITY FORUM & PRAYER LINE INTENTIONS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 shadow-xs" id="member-social-wall">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-sans font-bold text-slate-805 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Choir360 Community Prayer Request Wall
              </h4>
              <span className="text-[10px] text-slate-450 italic font-medium">Connected with Tamil Choirs</span>
            </div>

            {/* Input Form */}
            {successPost && (
              <p className="text-xs p-2 bg-emerald-50 text-emerald-805 border border-emerald-200 rounded-lg font-medium">
                {successPost}
              </p>
            )}

            <form onSubmit={handlePostPrayer} className="space-y-3" id="social-post-prayer-form">
              <div className="relative">
                <textarea
                  value={newPrayerText}
                  onChange={e => setNewPrayerText(e.target.value)}
                  placeholder="Share general choir announcements, propose liturgical intentions, or attach a feast photo..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none h-18 text-slate-805 bg-slate-50/20"
                />
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => alert("Photo upload simulated: Image attached successfully! Ready for server proxy uploading.")}
                  className="text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium bg-slate-105 px-2 py-1 rounded border border-slate-200 cursor-pointer transition"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-400" /> Attach Photo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Share to Choir Wall
                </button>
              </div>
            </form>

            {/* Prayers List Feed */}
            <div className="space-y-3.5 pt-2" id="prayers-forum-feed">
              {prayers.map((pr) => (
                <div key={pr.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-805 leading-none">{pr.author}</p>
                      <span className="text-[9px] font-mono text-slate-400">Posted on General Parish feed</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-800 border border-purple-100 uppercase">
                      {pr.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">{pr.text}</p>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100/60 justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleIncrementPray(pr.id)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer ${
                        pr.userPrayed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-white hover:bg-slate-100 text-slate-650 border border-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${pr.userPrayed ? 'fill-emerald-700 text-emerald-700 animate-bounce' : 'text-slate-405'}`} />
                      <span>{pr.userPrayed ? "I am Praying" : "Pray with Us"} ({pr.prays})</span>
                    </button>
                    <span className="text-[9px] text-slate-400 font-mono">Feedback is live</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      </>}

    </div>
  );
};
