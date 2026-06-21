import { CloudinaryMediaRecord } from '../types';
import { createRecordMetadata } from './recordMetadata';
import { upsertTenantRecord } from './firebase';
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

export async function uploadMediaToCloudinary(
  file: File,
  context: CloudinaryUploadContext,
): Promise<CloudinaryMediaRecord> {
  if (!cloudName) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME before uploading media.');
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
