import { config } from 'dotenv';
import { getAdminFirestore } from './firebaseAdmin.mjs';

config({ path: '.env.local', override: false });

const db = getAdminFirestore();
const now = new Date().toISOString();
const context = {
  tenantId: process.env.VITE_DEFAULT_TENANT_ID || 'global',
  parishId: process.env.VITE_DEFAULT_PARISH_ID || 'st-thomas-cathedral',
  choirId: process.env.VITE_DEFAULT_CHOIR_ID || 'st-thomas-cathedral-choir',
  createdAt: now,
  updatedAt: now,
  createdBy: 'seed-script',
  updatedBy: 'seed-script',
  status: 'active',
  deletedAt: null,
  deletedBy: null,
};

const seed = {
  choirs: [
    {
      id: context.choirId,
      name: 'St. Thomas Cathedral Choir',
      parishName: 'St. Thomas Cathedral',
      city: 'Madurai',
      languagePreferences: ['English', 'Tamil', 'Malayalam', 'Telugu', 'Hindi'],
      ...context,
    },
  ],
  members: [
    {
      id: 'seed-member-001',
      firstName: 'Demo',
      lastName: 'Cantor',
      gender: 'Female',
      dob: '2000-01-01',
      mobile: '',
      whatsapp: '',
      email: 'demo.cantor@example.com',
      address: '',
      parish: 'St. Thomas Cathedral',
      choirName: 'St. Thomas Cathedral Choir',
      voiceType: 'Soprano',
      memberType: 'Singer',
      skills: 'Lead cantor, psalm response',
      experience: 5,
      emergencyContact: { name: '', relationship: '', phone: '' },
      photoUrl: '',
      joiningDate: now.slice(0, 10),
      attendanceRate: 94,
      ...context,
    },
  ],
  masses: [
    {
      id: 'seed-mass-001',
      name: 'Sunday Solemn Holy Mass',
      category: 'Sunday Mass',
      date: now.slice(0, 10),
      time: '06:30 AM',
      language: 'Tamil',
      ...context,
    },
  ],
  payments: [
    {
      id: 'seed-payment-001',
      partyName: 'Demo Family',
      mobile: '',
      massType: 'Thanksgiving Mass',
      massDate: now.slice(0, 10),
      massTime: '06:30 AM',
      promisedAmount: 5000,
      receivedAmount: 0,
      pendingAmount: 5000,
      status: 'Pending',
      remarks: 'Seed payment for local testing.',
      ...context,
    },
  ],
  announcements: [
    {
      id: 'seed-announcement-001',
      title: 'Welcome to CHOIR360 X',
      content: 'Your Firebase-backed church operations workspace is ready.',
      date: now.slice(0, 10),
      publishedBy: 'System',
      category: 'News',
      ...context,
    },
  ],
};

const batch = db.batch();

for (const [collectionName, records] of Object.entries(seed)) {
  for (const record of records) {
    batch.set(db.collection(collectionName).doc(record.id), record, { merge: true });
  }
}

await batch.commit();
console.log('Seeded Firestore collections:', Object.keys(seed));
