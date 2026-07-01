import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.');

  // Option A: Full JSON service account env var (Render production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  }

  // Option A: Individual env vars (Render production)
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Render stores \n as literal \\n — restore real newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId,
    });
  }

  // Option C: serviceAccountKey.json file (local dev / one-off scripts)
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : resolve(process.cwd(), 'serviceAccountKey.json');

  if (existsSync(keyPath)) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  }

  throw new Error(
    'No Firebase Admin credentials found.\n' +
    'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars (Render),\n' +
    'or place serviceAccountKey.json in the project root (local dev).'
  );
}

export function getAdminAuth() { getAdminApp(); return admin.auth(); }
export function getAdminFirestore() { getAdminApp(); return admin.firestore(); }
