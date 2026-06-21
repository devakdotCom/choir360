import admin from 'firebase-admin';

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required.');
  }

  return admin.initializeApp({ projectId });
}

export function getAdminAuth() {
  getAdminApp();
  return admin.auth();
}

export function getAdminFirestore() {
  getAdminApp();
  return admin.firestore();
}
