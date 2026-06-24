import { signInAnonymously } from 'firebase/auth';
import { CloudinaryMediaRecord } from '../types';
import { createRecordMetadata } from './recordMetadata';
import { auth, upsertTenantRecord } from './firebase';
import { apiFetch } from './apiClient';

// ── Upload context ────────────────────────────────────────────────────────────

export interface CloudinaryUploadContext {
  moduleName: CloudinaryMediaRecord['moduleName'];
  relatedRecordId: string;
  uploadedByUserId: string;
  /** Original filename before any compression */
  originalFileName?: string;
  /** MIME type of the original file */
  mimeType?: string;
  /** Size in bytes of the original file */
  sizeBytes?: number;
}

// ── Cloudinary API response shape ─────────────────────────────────────────────

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  bytes?: number;
  format?: string;
  resource_type?: 'image' | 'video' | 'raw';
  created_at?: string;
  /** Pixel dimensions — returned for image uploads */
  width?: number;
  height?: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadFolder = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || 'choir360';

// ── URL builder ───────────────────────────────────────────────────────────────

export function buildCloudinaryImageUrl(publicId: string, transformation: string) {
  if (!cloudName) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
}

// ---------------------------------------------------------------------------
// CLIENT-SIDE UPLOAD VALIDATION
// Re-exported from imageValidation.ts for backward compat — callers that
// imported validateMediaFile directly from this module continue to work.
// ---------------------------------------------------------------------------
export { validateImageFile as validateMediaFile } from '../utils/imageValidation';

// ── Main upload function ──────────────────────────────────────────────────────

/**
 * Uploads a file to Cloudinary using a server-side signed request, then
 * writes the resulting metadata to Firestore.
 *
 * Firestore write is best-effort: if it fails (e.g. anonymous user without
 * tenant claims), the function still returns the Cloudinary record so callers
 * can use the CDN URLs immediately.
 */
export async function uploadMediaToCloudinary(
  file: File,
  context: CloudinaryUploadContext,
): Promise<CloudinaryMediaRecord> {
  if (!cloudName) {
    throw new Error(
      'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME before uploading media.',
    );
  }

  // The signature endpoint requires a Firebase ID token.
  // Public registration users are unauthenticated, so sign them in anonymously.
  if (auth && !auth.currentUser) {
    await signInAnonymously(auth);
  }

  // ── 1. Get signed upload parameters from the backend ──────────────────────
  const signatureResponse = await apiFetch('/api/cloudinary/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: `${uploadFolder}/${context.moduleName}`,
      tags: ['choir360', context.moduleName, context.relatedRecordId],
      context: {
        moduleName: context.moduleName,
        relatedRecordId: context.relatedRecordId,
        uploadedByUserId: context.uploadedByUserId,
      },
    }),
  });

  if (!signatureResponse.ok) {
    const errorBody = await signatureResponse.json().catch(() => ({}));
    throw new Error(
      errorBody?.error || 'Could not create a secure Cloudinary upload signature.',
    );
  }

  const sig = await signatureResponse.json();

  // ── 2. Upload the file directly to Cloudinary ─────────────────────────────
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', sig.timestamp);
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);
  formData.append('tags', sig.tags);
  formData.append('context', sig.context);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: 'POST', body: formData },
  );

  if (!uploadResponse.ok) {
    const errBody = await uploadResponse.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || 'Cloudinary upload failed.');
  }

  const uploaded = (await uploadResponse.json()) as CloudinaryUploadResponse;

  // ── 3. Build the local media record ───────────────────────────────────────
  const uploadedAt = uploaded.created_at || new Date().toISOString();
  const mediaRecord: CloudinaryMediaRecord = {
    id: uploaded.public_id.replace(/[/.]/g, '_'),
    publicId: uploaded.public_id,
    secureUrl: uploaded.secure_url,
    thumbnailUrl: buildCloudinaryImageUrl(
      uploaded.public_id,
      'c_fill,w_240,h_240,q_auto,f_auto',
    ),
    optimizedUrl: buildCloudinaryImageUrl(uploaded.public_id, 'q_auto,f_auto'),
    uploadedAt,
    uploadedByUserId: context.uploadedByUserId,
    moduleName: context.moduleName,
    relatedRecordId: context.relatedRecordId,
    bytes: uploaded.bytes,
    format: uploaded.format,
    resourceType: uploaded.resource_type || 'auto',
    width: uploaded.width,
    height: uploaded.height,
    originalFileName: context.originalFileName,
    mimeType: context.mimeType,
    sizeBytes: context.sizeBytes ?? uploaded.bytes,
    ...createRecordMetadata(context.uploadedByUserId, 'active'),
  };

  // ── 4. Persist metadata to Firestore (best-effort) ────────────────────────
  // May fail for anonymous users who lack tenant custom claims. The Cloudinary
  // upload already succeeded, so we return the record regardless.
  try {
    await upsertTenantRecord('media', mediaRecord, context.uploadedByUserId);
  } catch (firestoreErr) {
    console.warn(
      '[Cloudinary] Firestore media record write skipped (non-fatal):',
      firestoreErr,
    );
  }

  return mediaRecord;
}
