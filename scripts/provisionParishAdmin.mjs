/**
 * provisionParishAdmin.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot script: sets Firebase custom claims + writes the Firestore /admins
 * document for a parish choir admin.
 *
 * Usage:
 *   node scripts/provisionParishAdmin.mjs
 *
 * Requires FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID) in .env / .env.local
 * and GOOGLE_APPLICATION_CREDENTIALS pointing to your service-account JSON.
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin.mjs';

config({ path: '.env.local', override: false });

// ── Target admin ──────────────────────────────────────────────────────────────
const ADMIN_EMAIL   = 'stjosephschoirambattur@gmail.com';
const ROLE          = 'choir_admin';          // full admin for this parish
const ARCHDIOCESE_ID = 'madras-mylapore';
const PARISH_ID     = 'church-of-sts-joseph-the-worker-philip-ambattur-ot';
const CHOIR_ID      = `${PARISH_ID}-choir`;
const PARISH_NAME   = 'Church of Sts Joseph the Worker & Philip';
const PLACE         = 'Ambattur OT';

// ── Step 1: Look up the Firebase Auth user ────────────────────────────────────
const auth = getAdminAuth();
let user;
try {
  user = await auth.getUserByEmail(ADMIN_EMAIL);
  console.log(`✓ Found Firebase user: ${user.uid} (${user.email})`);
} catch (err) {
  // Account doesn't exist — create it with a temporary password
  console.log(`ℹ  No account found for ${ADMIN_EMAIL} — creating one...`);
  const tempPassword = 'Choir360@' + Math.random().toString(36).slice(-6).toUpperCase();
  user = await auth.createUser({
    email: ADMIN_EMAIL,
    password: tempPassword,
    displayName: 'Parish Admin — Sts Joseph & Philip',
    emailVerified: false,
  });
  console.log(`✓ Firebase Auth account created: ${user.uid}`);
  console.log(`  Temporary password: ${tempPassword}`);
  console.log(`  ⚠  Share this password securely with the admin and ask them to change it on first login.`);
}

// ── Step 2: Set custom claims ─────────────────────────────────────────────────
const claims = {
  role:          ROLE,
  tenantId:      ARCHDIOCESE_ID,
  parishId:      PARISH_ID,
  choirId:       CHOIR_ID,
  archdioceseId: ARCHDIOCESE_ID,
  parishName:    `${PARISH_NAME} - ${PLACE}`,
};

await auth.setCustomUserClaims(user.uid, claims);
console.log('✓ Custom claims set:', claims);

// ── Step 3: Write /admins/{uid} to Firestore ──────────────────────────────────
const db = getAdminFirestore();
const now = new Date().toISOString();

const adminDoc = {
  uid:            user.uid,
  email:          ADMIN_EMAIL,
  displayName:    user.displayName || 'Parish Admin',
  role:           ROLE,
  archdioceseId:  ARCHDIOCESE_ID,
  parishId:       PARISH_ID,
  choirId:        CHOIR_ID,
  parishName:     PARISH_NAME,
  place:          PLACE,
  isPrimaryAdmin: true,
  status:         'active',
  // tenant envelope required by security rules
  tenantId:       ARCHDIOCESE_ID,
  createdAt:      now,
  updatedAt:      now,
  createdBy:      'system-provision',
  updatedBy:      'system-provision',
};

await db.collection('admins').doc(user.uid).set(adminDoc, { merge: true });
console.log(`✓ Firestore /admins/${user.uid} written`);

// ── Step 4: Also write the parish doc if it doesn't exist ────────────────────
const parishRef = db.collection('parishes').doc(PARISH_ID);
const parishSnap = await parishRef.get();
if (!parishSnap.exists) {
  await parishRef.set({
    id:              PARISH_ID,
    archdioceseId:   ARCHDIOCESE_ID,
    parishName:      PARISH_NAME,
    place:           PLACE,
    displayName:     `${PARISH_NAME} - ${PLACE}`,
    slug:            PARISH_ID,
    status:          'active',
    createdAt:       now,
    updatedAt:       now,
  });
  console.log(`✓ Firestore /parishes/${PARISH_ID} created`);
} else {
  console.log(`ℹ  /parishes/${PARISH_ID} already exists — skipped`);
}

console.log('\n✅ Done! The admin must sign out and sign back in for claims to take effect.');
console.log(`   Email : ${ADMIN_EMAIL}`);
console.log(`   Parish: ${PARISH_NAME} (${PLACE})`);
console.log(`   Role  : ${ROLE}`);
console.log(`   Parish ID: ${PARISH_ID}`);
