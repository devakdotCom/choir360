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
};

const batch = db.batch();

for (const [collectionName, records] of Object.entries(seed)) {
  for (const record of records) {
    batch.set(db.collection(collectionName).doc(record.id), record, { merge: true });
  }
}

await batch.commit();
console.log('Seeded Firestore collections:', Object.keys(seed));
