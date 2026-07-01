export type Role =
  | 'super_admin'
  | 'diocese_admin'
  | 'parish_admin'
  | 'choir_admin'
  | 'choir_member'
  | 'public_user';

export type Language = 'en' | 'ta' | 'ml' | 'te' | 'hi';

export type RecordStatus = string;

export interface TenantScopedRecord {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: RecordStatus;
  archdioceseId: string;
  parishName: string;
  tenantId: string;
  parishId: string;
  choirId: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CloudinaryMediaRecord extends TenantScopedRecord {
  id: string;
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  optimizedUrl: string;
  uploadedAt: string;
  uploadedByUserId: string;
  moduleName:
    | 'members'
    | 'events'
    | 'feasts'
    | 'choir-gallery'
    | 'songs'
    | 'announcements'
    | 'parishes'
    | 'dioceses'
    | 'ai-posters'
    | 'qr-codes'
    | 'documents';
  relatedRecordId: string;
  bytes?: number;
  format?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  width?: number;
  height?: number;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export type SyncedRecord<T> = T & TenantScopedRecord;

export type VoiceType = 'Soprano' | 'Alto' | 'Tenor' | 'Bass' | 'None';

export type MemberType =
  | 'Singer'
  | 'Keyboard'
  | 'Guitar'
  | 'Violin'
  | 'Flute'
  | 'Tabla'
  | 'Pad'
  | 'Drums'
  | 'Harmonium'
  | 'Veena'
  | 'Mridangam'
  | 'Other';

export type MemberStatus =
  | 'Pending'
  | 'Correction Requested'
  | 'Approved'
  | 'Active Member'
  | 'Rejected'
  | 'Admin';

export interface Member {
  id: string;
  photoUrl: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  parish: string;
  choirName: string;
  voiceType: VoiceType;
  memberType: MemberType;
  /** Instrument played (if instrumentalist). Same as memberType for non-singers. */
  instrument?: string;
  skills: string;
  experience: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status: MemberStatus;
  joiningDate: string;
  correctionNote?: string;
  attendanceRate?: number;
  /** Weight for share calculation: singers = 1, instrumentalists = 2 */
  shareWeight?: 1 | 2;
}

// =============================================================================
// Mass & Liturgy
// =============================================================================

export type MassCategory =
  | 'Sunday Mass'
  | 'Weekday Mass'
  | 'Special Mass'
  | 'Wedding'
  | 'Funeral'
  | 'Death Mass'
  | 'Death Anniversary Mass'
  | 'Feast Day'
  | 'Ordination'
  | 'First Holy Communion'
  | 'Confirmation'
  | 'Novena';

/** Categories that require payment tracking */
export const PAYMENT_MASS_CATEGORIES: MassCategory[] = [
  'Special Mass',
  'Wedding',
  'Funeral',
  'Death Mass',
  'Death Anniversary Mass',
  'Feast Day',
  'Ordination',
  'First Holy Communion',
  'Confirmation',
];

export function isPaymentMassCategory(cat: MassCategory): boolean {
  return PAYMENT_MASS_CATEGORIES.includes(cat);
}

export interface Mass {
  id: string;
  name: string;
  category: MassCategory;
  date: string;
  time: string;
  language: string;
  celebrant?: string;
  venue?: string;
  notes?: string;
  /** Choir members who attended this Mass */
  attendingMemberIds?: string[];
}

export interface Payment {
  id: string;
  massId?: string;
  partyName: string;
  mobile: string;
  massType: string;
  massDate: string;
  massTime: string;
  /** Amount proposed / promised (₹) */
  promisedAmount: number;
  /** Amount actually received (₹) */
  receivedAmount: number;
  /** Remaining balance (₹) */
  pendingAmount: number;
  /** Date payment was received (ISO string) */
  dateReceived?: string;
  /** Who made the payment */
  whoPaid?: string;
  /** Cash / UPI / Cheque / NEFT */
  paymentMode?: string;
  receiptNo?: string;
  remarks?: string;
  status: 'Pending' | 'Received' | 'Partial';
  /** Sponsor name (e.g. for feast days) */
  sponsor?: string;
}

export interface ShareCalculation {
  id: string;
  paymentId: string;
  massName: string;
  date: string;
  totalAmount: number;
  singersCount: number;
  instrumentalistsCount: number;
  /** singers*1 + instrumentalists*2 */
  totalUnits: number;
  /** totalAmount / totalUnits */
  unitValue: number;
  /** unitValue * 1 */
  singerShare: number;
  /** unitValue * 2 */
  instrumentalistShare: number;
  isLocked: boolean;
  participatingMembers: {
    memberId: string;
    name: string;
    type: MemberType;
    weight: 1 | 2;
    share: number;
  }[];
}

// =============================================================================
// Attendance
// =============================================================================

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  entityId: string;
  entityType: 'Mass' | 'Rehearsal' | 'Event';
  entityName: string;
  date: string;
  memberId: string;
  memberName: string;
  status: AttendanceStatus;
  notes?: string;
}

// =============================================================================
// Rehearsals
// =============================================================================

export type RehearsalType =
  | 'Regular Practice'
  | 'Pre-Sunday Practice'
  | 'Feast Preparation'
  | 'New Song Workshop'
  | 'Special Preparation'
  | 'Sectional Practice';

export interface Rehearsal {
  id: string;
  name: string;
  type: RehearsalType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  conductor?: string;
  songs?: string[];
  notes?: string;
  attendingMemberIds?: string[];
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

// =============================================================================
// Events
// =============================================================================

export type EventCategory =
  | 'Choir Practice'
  | 'Feast'
  | 'Retreat'
  | 'Pilgrimage'
  | 'Tour'
  | 'Concert'
  | 'Parish Event'
  | 'Diocese Event'
  | 'Competition';

export interface ChoirEvent {
  id: string;
  name: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  description: string;
  bannerUrl: string;
  rsvps: {
    [memberId: string]: 'Going' | 'Not Going' | 'Maybe';
  };
}

// =============================================================================
// Songs
// =============================================================================

export interface Song {
  id: string;
  title: string;
  displayTitle?: string;
  lyricsTitle?: string;
  language: 'English' | 'Tamil' | 'Malayalam' | 'Telugu' | 'Hindi';
  album?: string;
  composer?: string;
  singer?: string;
  category:
    | 'Roman Catholic Songs'
    | 'Praise & Worship'
    | 'Devotional Songs'
    | 'Retreat Songs'
    | 'Choir Competition Songs'
    | 'Non-Catholic Christian Songs'
    | 'Unknown'
    | 'Jebathotta Jeyageethangal';
  source?: string;
  lyrics: string;
  lyricsEnglishPattern?: string;
  chordSheet?: string;
  pdfUrl?: string;
  sourcePdfUrl?: string;
  sourcePageNumber?: number;
  pageNumber?: number;
  sourceUrl?: string;
  sourceSearchText?: string;
  audioUrl?: string;
  videoUrl?: string;
}

// =============================================================================
// Bible & Readings
// =============================================================================

export type BibleLanguage = 'ta' | 'en';

export interface BibleDocument {
  id: BibleLanguage;
  label: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  pdfUrl?: string;
  isAvailable: boolean;
  unavailableMessage?: string;
  chapterIndex?: {
    id: string;
    testament: string;
    book: string;
    printedPage: number;
    pdfPage: number;
  }[];
}

export interface DailyReadingSection {
  heading: string;
  reference?: string;
  text: string;
}

export interface DailyReading {
  id: string;
  date: string;
  language: BibleLanguage;
  title: string;
  liturgicalDay: string;
  firstReading?: DailyReadingSection;
  psalm?: DailyReadingSection;
  secondReading?: DailyReadingSection;
  gospelAcclamation?: DailyReadingSection;
  gospel?: DailyReadingSection;
  reflection?: DailyReadingSection;
  feast?: string;
  saint?: string;
  liturgicalColor?: string;
  sourceUrl: string;
  publicDisplay: boolean;
  lastSyncedAt?: string;
  syncStatus: 'synced' | 'cached' | 'failed' | 'pending';
  syncMessage?: string;
}

// =============================================================================
// Announcements & Notifications
// =============================================================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  publishedBy: string;
  category: 'News' | 'Circular' | 'Choir Notice' | 'Feast Update' | 'Finance' | 'Rehearsal';
}

export interface SaintOfDay {
  name: string;
  feastDate: string;
  description: string;
  imageUrl: string;
  patronOf: string;
}
