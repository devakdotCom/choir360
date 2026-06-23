/**
 * scripts/seedMadrasMylaporeParishes.ts
 *
 * Seeds all Archdiocese of Madras-Mylapore parishes into Firestore.
 *
 * Run:
 *   npx ts-node --esm scripts/seedMadrasMylaporeParishes.ts
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a Firebase
 * service account JSON with Firestore write permissions.
 */

import * as admin from 'firebase-admin';
import { MADRAS_MYLAPORE_PARISHES } from '../src/data/madrasMylaporeParishes';

// Initialise Admin SDK (uses GOOGLE_APPLICATION_CREDENTIALS or ADC)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function seedParishes(): Promise<void> {
  const batch = db.batch();
  let count = 0;

  for (const parish of MADRAS_MYLAPORE_PARISHES) {
    const ref = db.collection('parishes').doc(parish.id);
    batch.set(ref, {
      ...parish,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`✅ Seeded ${count} parishes into Firestore collection "parishes".`);
}

seedParishes().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
