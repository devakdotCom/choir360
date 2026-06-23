import { signInAnonymously } from 'firebase/auth';
import { CloudinaryMediaRecord } from '../types';
import { createRecordMetadata } from './recordMetadata';
import { auth, upsertTenantRecord } from './firebase';
import { apiFetch } from './apiClient';

interface CloudinaryUploadContext {
  moduleName: CloudinaryMediaRecord['moduleName'];
  relatedRecordId: string;
  uploadedByUserId: string;
}

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  bytes?: number;
  format?: string;
  resource_type?: 'image' | 'video' | 'raw';
  created_at?: string;
}

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadFolder = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || 'choir360';

export function buildCloudinaryImageUrl(publicId: string, transformation: string) {
  if (!cloudName) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
}

// ---------------------------------------------------------------------------
// CLIENT-SIDE UPLOAD VALIDATION
// Rejects bad files immediately instead of after a signature round-trip and
// a multi-MB upload to Cloudinary. The server-side signature endpoint trusts
// the folder name but does not otherwise constrain file size/type/dimensions,
// so this is the only real gate today — keep it in sync with any future
// server-side checks rather than relying on it alone.
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_IMAGE_DIMENSION_PX = 6000;

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file could not be read as a valid image.'));
    };
    img.src = url;
  });
}

export async function validateMediaFile(file: File): Promise<void> {
  if (!file || file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${formatBytes(file.size)}). Maximum allowed size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type "${file.type || 'unknown'}". Allowed types: JPEG, PNG, WebP, HEIC.`);
  }

  const { width, height } = await readImageDimensions(file);
  if (width > MAX_IMAGE_DIMENSION_PX || height > MAX_IMAGE_DIMENSION_PX) {
    throw new Error(`Image dimensions (${width}x${height}) exceed the maximum of ${MAX_IMAGE_DIMENSION_PX}px per side.`);
  }
}

export async function uploadMediaToCloudinary(
  file: File,
  context: CloudinaryUploadContext,
): Promise<CloudinaryMediaRecord> {
  if (!cloudName) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME before uploading media.');
  }

  await validateMediaFile(file);

  // The signature endpoint requires a Firebase ID token. Public registration
  // users are not logged in, so sign them in anonymously to obtain one.
  if (auth && !auth.currentUser) {
    await signInAnonymously(auth);
  }

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
    throw new Error('Could not create a secure Cloudinary upload signature.');
  }

  const signaturePayload = await signatureResponse.json();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signaturePayload.apiKey);
  formData.append('timestamp', signaturePayload.timestamp);
  formData.append('signature', signaturePayload.signature);
  formData.append('folder', signaturePayload.folder);
  formData.append('tags', signaturePayload.tags);
  formData.append('context', signaturePayload.context);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error('Cloudinary upload failed.');
  }

  const uploaded = await uploadResponse.json() as CloudinaryUploadResponse;
  const uploadedAt = uploaded.created_at || new Date().toISOString();
  const mediaRecord: CloudinaryMediaRecord = {
    id: uploaded.public_id.replace(/[/.]/g, '_'),
    publicId: uploaded.public_id,
    secureUrl: uploaded.secure_url,
    thumbnailUrl: buildCloudinaryImageUrl(uploaded.public_id, 'c_fill,w_240,h_240,q_auto,f_auto'),
    optimizedUrl: buildCloudinaryImageUrl(uploaded.public_id, 'q_auto,f_auto'),
    uploadedAt,
    uploadedByUserId: context.uploadedByUserId,
    moduleName: context.moduleName,
    relatedRecordId: context.relatedRecordId,
    bytes: uploaded.bytes,
    format: uploaded.format,
    resourceType: uploaded.resource_type || 'auto',
    ...createRecordMetadata(context.uploadedByUserId, 'active'),
  };

  await upsertTenantRecord('media', mediaRecord, context.uploadedByUserId);
  return mediaRecord;
}
