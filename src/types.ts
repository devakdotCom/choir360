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
}

export type SyncedRecord<T> = T & TenantScopedRecord;

export type VoiceType = 'Soprano' | 'Alto' | 'Tenor' | 'Bass' | 'None';

export type MemberType = 'Singer' | 'Keyboard' | 'Guitar' | 'Violin' | 'Flute' | 'Tabla' | 'Pad' | 'Drums' | 'Other';

export type MemberStatus = 'Pending' | 'Correction Requested' | 'Approved' | 'Active Member';

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
  skills: string;
  experience: number; // Years of experience
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status: MemberStatus;
  joiningDate: string;
  correctionNote?: string;
  attendanceRate?: number;
}

export type MassCategory = 'Sunday Mass' | 'Weekday Mass' | 'Special Mass' | 'Death Mass' | 'Death Anniversary Mass';

export interface Mass {
  id: string;
  name: string; // e.g. "Sunday 1st Mass (Tamil)", "Feast Mass of St. Antony"
  category: MassCategory;
  date: string;
  time: string;
  language: string;
}

export interface Payment {
  id: string;
  partyName: string;
  mobile: string;
  massType: string;
  massDate: string;
  massTime: string;
  promisedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  dateReceived?: string;
  status: 'Pending' | 'Received';
  remarks?: string;
}

export interface ShareCalculation {
  id: string;
  paymentId: string;
  massName: string;
  date: string;
  totalAmount: number;
  singersCount: number;
  instrumentalistsCount: number;
  totalUnits: number;
  unitValue: number;
  singerShare: number;
  instrumentalistShare: number;
  isLocked: boolean;
  participatingMembers: {
    memberId: string;
    name: string;
    type: MemberType;
    share: number;
  }[];
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  entityId: string; // MassId or EventId
  entityType: 'Mass' | 'Practice' | 'Event';
  entityName: string;
  date: string;
  memberId: string;
  memberName: string;
  status: AttendanceStatus;
}

export type EventCategory = 'Choir Practice' | 'Feast' | 'Retreat' | 'Pilgrimage' | 'Tour' | 'Concert' | 'Parish Event';

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

export interface Song {
  id: string;
  title: string;
  displayTitle?: string;
  lyricsTitle?: string; // Tamil transliterated title or original
  language: 'English' | 'Tamil' | 'Malayalam' | 'Telugu' | 'Hindi';
  album?: string;
  composer?: string;
  singer?: string;
  category: 'Roman Catholic Songs' | 'Praise & Worship' | 'Devotional Songs' | 'Retreat Songs' | 'Choir Competition Songs' | 'Non-Catholic Christian Songs' | 'Unknown' | 'Jebathotta Jeyageethangal';
  source?: string;
  lyrics: string;
  lyricsEnglishPattern?: string; // Standard English phonetic transliteration for search comparison
  chordSheet?: string;
  pdfUrl?: string;
  sourcePdfUrl?: string;
  sourcePageNumber?: number;
  pageNumber?: number;
  sourceUrl?: string;
  sourceSearchText?: string;
  audioUrl?: string; // Base64 audio or mockup
  videoUrl?: string; // Youtube link or mock
}

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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  publishedBy: string;
  category: 'News' | 'Circular' | 'Choir Notice' | 'Feast Update';
}

export interface SaintOfDay {
  name: string;
  feastDate: string;
  description: string;
  imageUrl: string;
  patronOf: string;
}
