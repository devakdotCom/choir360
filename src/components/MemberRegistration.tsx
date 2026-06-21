import React, { useState } from 'react';
import { Member, MemberStatus, VoiceType, MemberType, Language } from '../types';
import {
  UserPlus,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileEdit,
  Trash2,
  Lock,
  PhoneCall,
  MapPin,
  ClipboardCheck,
  Award
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { uploadMediaToCloudinary } from '../services/cloudinary';

interface MemberRegistrationProps {
  currentLang: Language;
  currentUserRole: string;
  members: Member[];
  onAddMember: (member: Member) => void;
  onUpdateMemberStatus: (memberId: string, status: MemberStatus, note?: string) => void;
}

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({
  currentLang,
  currentUserRole,
  members,
  onAddMember,
  onUpdateMemberStatus
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;
  const isAdmin = ['super_admin', 'diocese_admin', 'parish_admin', 'choir_admin'].includes(currentUserRole);

  // State for form
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('2000-01-01');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [parish, setParish] = useState('Our Lady of Snows Basilica, Thoothukudi');
  const [choirName, setChoirName] = useState('St. Thomas Cathedral Choir');
  const [voiceType, setVoiceType] = useState<VoiceType>('Soprano');
  const [memberType, setMemberType] = useState<MemberType>('Singer');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState(1);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Status message
  const [successMsg, setSuccessMsg] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'admin_dashboard'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !mobile || !email) {
      alert("Please fill in all mandatory fields: First Name, Last Name, Mobile, and Email.");
      return;
    }

    const memberId = `M${String(members.length + 1).padStart(3, '0')}`;
    let finalPhotoUrl = photoUrl;

    if (photoFile) {
      try {
        setUploadStatus('Uploading profile photo to Cloudinary...');
        const media = await uploadMediaToCloudinary(photoFile, {
          moduleName: 'members',
          relatedRecordId: memberId,
          uploadedByUserId: 'public_user',
        });
        finalPhotoUrl = media.thumbnailUrl || media.optimizedUrl || media.secureUrl;
        setUploadStatus('Photo uploaded and Cloudinary metadata saved.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        setUploadStatus('');
        alert(`Profile photo upload failed: ${message}`);
        return;
      }
    }

    const newMember: Member = {
      id: memberId,
      photoUrl: finalPhotoUrl,
      firstName,
      lastName,
      gender,
      dob,
      mobile,
      whatsapp: whatsapp || mobile,
      email,
      address,
      parish,
      choirName,
      voiceType: memberType === 'Singer' ? voiceType : 'None',
      memberType,
      skills,
      experience: Number(experience),
      emergencyContact: {
        name: emergencyName || 'Guardian',
        relationship: emergencyRelation || 'Family',
        phone: emergencyPhone || mobile
      },
      status: 'Pending',
      joiningDate: new Date().toISOString().split('T')[0],
      attendanceRate: 0
    };

    onAddMember(newMember);
    setSuccessMsg(`Success! ${firstName}'s registration is submitted as PENDING. Admins can approve it in the "Approval Desk" active tab.`);
    
    // Clear form
    setFirstName('');
    setLastName('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setSkills('');
    setPhotoFile(null);
    setUploadStatus('');
    setEmergencyName('');
    setEmergencyRelation('');
    setEmergencyPhone('');

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  return (
    <div className="space-y-8" id="member-registration-component">
      {/* Top Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3" id="registration-header">
        <div className="flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="font-sans font-bold text-xl text-slate-800">{dict.registerTitle}</h2>
            <p className="text-xs text-slate-500">Multilingual recruitment form & administrative validation center</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-200 cursor-pointer ${
              activeTab === 'form' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-reg-form"
          >
            Registration Form (Public)
          </button>
          
          <button
            onClick={() => setActiveTab('admin_dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-200 cursor-pointer flex items-center gap-1 ${
              activeTab === 'admin_dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-approval-desk"
          >
            <Lock className="w-3.5 h-3.5" />
            {dict.registrationAudit} {isAdmin ? '(Admin Active)' : '(Simulated Audit)'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-medium flex items-center gap-2" id="success-banner">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VIEW 1: REGISTRATION FORM */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="registration-form-view">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6" id="member-form">
            <h3 className="font-sans font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">Contact & Background details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Antony / Maria"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Susairaj"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mobile Number *</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Leave empty to use mobile number"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. antony@gmail.com"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Postal Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your full residence address..."
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16"
                />
              </div>
            </div>

            <h3 className="font-sans font-bold text-slate-900 text-sm pt-4 pb-2 border-b border-slate-100">Liturgical Choral Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Parish of Origin</label>
                <input
                  type="text"
                  value={parish}
                  onChange={(e) => setParish(e.target.value)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Choir Name</label>
                <input
                  type="text"
                  value={choirName}
                  onChange={(e) => setChoirName(e.target.value)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Member Primary Role</label>
                <select
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value as MemberType)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Singer">Singer (Vocalist)</option>
                  <option value="Keyboard">Keyboard (Harmonium/Organ)</option>
                  <option value="Guitar">Acoustic / Lead Guitar</option>
                  <option value="Violin">Symphonic Violin</option>
                  <option value="Flute">Church Transverse Flute</option>
                  <option value="Tabla">Acoustic Tabla</option>
                  <option value="Pad">Electric Choral Pad</option>
                  <option value="Drums">Drums & Timpani</option>
                  <option value="Other">Other supporting instrument</option>
                </select>
              </div>

              {memberType === 'Singer' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">{dict.voiceType} *</label>
                  <select
                    value={voiceType}
                    onChange={(e) => setVoiceType(e.target.value as VoiceType)}
                    className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50 font-bold text-emerald-800"
                  >
                    <option value="Soprano">Soprano (Melodic Alto High)</option>
                    <option value="Alto">Alto (Harmonic Mid Range)</option>
                    <option value="Tenor">Tenor (Male Clear Register)</option>
                    <option value="Bass">Bass (Male Resonant Base)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Voice Register (Not applicable)</label>
                  <input
                    type="text"
                    disabled
                    value="None (Instrumentalist Mode active)"
                    className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-100 bg-slate-50 text-slate-400 cur-not-allowed"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Years of Music Experience</label>
                <input
                  type="number"
                  min="0"
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Profile Photo Selection (Mock URL)</label>
                <select
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150">Avatar 1 (Male Secular)</option>
                  <option value="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150">Avatar 2 (Female Solemn)</option>
                  <option value="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150">Avatar 3 (Male Parishioner)</option>
                  <option value="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150">Avatar 4 (Female Cantor)</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
                <label className="text-[11px] font-bold text-emerald-800 uppercase">Cloudinary Profile Photo Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="mt-2 w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-2 text-[10px] leading-relaxed text-emerald-800">
                  Uploaded images go to Cloudinary first; the returned public ID, secure URL, thumbnail URL, optimized URL, upload timestamp, module name, related member ID, and uploader ID are then written to Firebase.
                </p>
                {photoFile && <p className="mt-1 text-[10px] font-bold text-slate-600">Selected: {photoFile.name}</p>}
                {uploadStatus && <p className="mt-1 text-[10px] font-bold text-emerald-700">{uploadStatus}</p>}
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Special Skills & Talents</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. sight-reading gregorian chants, tempo moderation"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <h3 className="font-sans font-bold text-slate-900 text-sm pt-4 pb-2 border-b border-slate-100">Emergency Guardianship contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Guardian e.g. Susairaj S"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Father / Spouse"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Contact Phone</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="e.g. 9444000000"
                  className="w-full text-xs px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                id="submit-registration-btn"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition shadow"
              >
                <Send className="w-4 h-4" />
                {dict.submitApproval}
              </button>
            </div>
          </form>

          {/* Workflow Status Roadmap Card (Educational) */}
          <div className="space-y-6" id="workflow-steps-road">
            <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-md">
              <h4 className="font-sans font-bold text-sm text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Choral Approval Workflow
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our strict liturgical validation process filters and generates secure identities for each active choral vocalist and organist.
              </p>

              <div className="space-y-4 pt-2">
                {/* Pending */}
                <div className="flex items-start gap-3">
                  <div className="bg-amber-950/80 border border-amber-800 text-amber-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">1. {dict.pendingApproval}</h5>
                    <p className="text-[10px] text-slate-400">Roster details submitted. Pending parish council & choir master details verification.</p>
                  </div>
                </div>

                {/* Correction requested */}
                <div className="flex items-start gap-3">
                  <div className="bg-rose-950/80 border border-rose-800 text-rose-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">2. {dict.correctionReq}</h5>
                    <p className="text-[10px] text-slate-400">Requires correction (e.g. blurry ID photo, unclear church parish code, incorrect voice octave register).</p>
                  </div>
                </div>

                {/* Approved */}
                <div className="flex items-start gap-3">
                  <div className="bg-blue-950/80 border border-blue-800 text-blue-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">3. Approved & Scheduled</h5>
                    <p className="text-[10px] text-slate-400">Validated by choir director. Ready for official mass share calculations and weekly rehearsals.</p>
                  </div>
                </div>

                {/* Active Member */}
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">4. {dict.activeMember}</h5>
                    <p className="text-[10px] text-slate-400">Active member. Enjoys absolute voting rights, specialized tours, custom uniforms, and digital earnings share.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test alert block */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2">
              <h5 className="text-xs font-bold text-slate-700">How to test this process:</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                1. Supply details and click <strong>Submit for Approval</strong> above.<br/>
                2. Click the <strong>Approval Desk</strong> tab at the top right.<br/>
                3. Switch your viewpoint role to <strong>Super Admin</strong> or <strong>Choir Admin</strong> to instantly approve, request a correction, or delete registrations!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ADMINISTRATOR APPROVAL DESK */}
      {activeTab === 'admin_dashboard' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6" id="admin-dashboard-view">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-sm">Choral Registrar verification core</h3>
              <p className="text-[11px] text-slate-500">Real-time status changes and correction notes distribution</p>
            </div>
            <div className="bg-amber-50 text-amber-800 font-mono text-[10px] uppercase font-bold px-3 py-1 rounded-lg border border-amber-200">
              Total Applicants: {members.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="applicants-table">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-4">Applicant Profile</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Role & Experience</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={m.photoUrl}
                        alt={m.firstName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                      />
                      <div>
                        <p className="font-bold text-slate-800">{m.firstName} {m.lastName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{m.id} • {m.gender}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-semibold text-slate-700">{m.parish}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {m.address}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 shrink-0" /> {m.mobile}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded text-[10px]">
                          {m.memberType}
                        </span>
                        {m.voiceType !== 'None' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-semibold rounded text-[10px]">
                            {m.voiceType}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">Experience: {m.experience} Years</p>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] inline-block ${
                        m.status === 'Active Member' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        m.status === 'Approved' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        m.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {m.status}
                      </span>
                      {m.correctionNote && (
                        <p className="text-[10px] font-mono text-slate-500 max-w-xs leading-tight line-clamp-2">
                          Note: "{m.correctionNote}"
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === 'Pending' || m.status === 'Correction Requested' ? (
                          <>
                            <button
                              onClick={() => {
                                const note = prompt("Enter correction comments for this applicant:") || "Please update your verification credentials.";
                                onUpdateMemberStatus(m.id, 'Correction Requested', note);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded text-[10px] flex items-center gap-1 transition"
                            >
                              <FileEdit className="w-3 h-3" /> Correction
                            </button>
                            <button
                              onClick={() => onUpdateMemberStatus(m.id, 'Active Member')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[10px] flex items-center gap-1 transition"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve & Activate
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const note = prompt("Enter correction request comments:") || "Required profile audit.";
                              onUpdateMemberStatus(m.id, 'Correction Requested', note);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded text-[10px] flex items-center gap-1 transition"
                          >
                            Revise Status
                          </button>
                        )}
                      </div>
                    </td>
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
