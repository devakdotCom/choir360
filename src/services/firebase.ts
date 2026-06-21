import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { DEFAULT_TENANT_CONTEXT, createRecordMetadata, updateRecordMetadata } from './recordMetadata';
import { TenantScopedRecord } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

const firebaseApp = isFirebaseConfigured && getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

export const COLLECTIONS = {
  members: 'members',
  choirs: 'choirs',
  masses: 'masses',
  events: 'events',
  attendance: 'attendance',
  payments: 'payments',
  paymentShares: 'paymentShares',
  songs: 'songs',
  calendars: 'calendars',
  notifications: 'notifications',
  announcements: 'announcements',
  approvalWorkflows: 'approvalWorkflows',
  auditLogs: 'auditLogs',
  appSettings: 'appSettings',
  dailyReadings: 'dailyReadings',
  media: 'cloudinaryMedia',
} as const;

type CollectionName = keyof typeof COLLECTIONS;

function requireDb() {
  if (!db) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to enable real-time sync.');
  }
  return db;
}

export function listenToTenantCollection<T>(
  collectionName: CollectionName,
  onChange: (records: T[]) => void,
  onError?: (error: Error) => void,
  extraConstraints: QueryConstraint[] = [],
  pageSize = 50,
): Unsubscribe {
  if (!db) return () => undefined;

  const constraints = [
    where('tenantId', '==', DEFAULT_TENANT_CONTEXT.tenantId),
    where('parishId', '==', DEFAULT_TENANT_CONTEXT.parishId),
    where('choirId', '==', DEFAULT_TENANT_CONTEXT.choirId),
    where('status', '!=', 'deleted'),
    orderBy('status'),
    orderBy('updatedAt', 'desc'),
    limit(pageSize),
    ...extraConstraints,
  ];

  return onSnapshot(
    query(collection(db, COLLECTIONS[collectionName]), ...constraints),
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T)),
    (error) => onError?.(error),
  );
}

export async function upsertTenantRecord<T extends { id: string } & Partial<TenantScopedRecord>>(
  collectionName: CollectionName,
  record: T,
  userId = auth?.currentUser?.uid || 'system',
) {
  const database = requireDb();
  const payload = {
    ...record,
    ...(record.createdAt ? updateRecordMetadata(record, userId) : createRecordMetadata(userId, record.status || 'active')),
  };
  await setDoc(doc(database, COLLECTIONS[collectionName], record.id), payload, { merge: true });
}

export async function updateTenantRecord<T extends Partial<TenantScopedRecord>>(
  collectionName: CollectionName,
  recordId: string,
  patch: T,
  userId = auth?.currentUser?.uid || 'system',
) {
  const database = requireDb();
  await updateDoc(doc(database, COLLECTIONS[collectionName], recordId), updateRecordMetadata(patch, userId) as DocumentData);
}

export async function batchUpsertTenantRecords<T extends { id: string } & Partial<TenantScopedRecord>>(
  collectionName: CollectionName,
  records: T[],
  userId = auth?.currentUser?.uid || 'system',
) {
  const database = requireDb();
  const batch = writeBatch(database);

  records.forEach((record) => {
    const payload = {
      ...record,
      ...(record.createdAt ? updateRecordMetadata(record, userId) : createRecordMetadata(userId, record.status || 'active')),
    };
    batch.set(doc(database, COLLECTIONS[collectionName], record.id), payload, { merge: true });
  });

  await batch.commit();
}
