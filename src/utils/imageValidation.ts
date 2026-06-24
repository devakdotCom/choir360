/**
 * Client-side image validation.
 *
 * Rejects bad files immediately — before the Base64 preview is shown and
 * certainly before any network round-trip. Keeps validation in one place so
 * it stays in sync with the server-side checks in cloudinary.ts.
 */

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
export const MAX_IMAGE_DIMENSION_PX = 6000;

function humanBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Validates the file type, size, and pixel dimensions.
 * Resolves with `{ width, height }` on success.
 * Rejects with a human-readable Error on failure.
 *
 * Note: HEIC/HEIF cannot be decoded by `<img>` in most browsers, so
 * dimension checking is skipped for those types — they still pass if the
 * file size is within limits.
 */
export async function validateImageFile(file: File): Promise<ImageDimensions> {
  if (!file || file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large (${humanBytes(file.size)}). Maximum allowed: ${humanBytes(MAX_FILE_SIZE_BYTES)}.`,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported type "${file.type || 'unknown'}". Allowed: JPEG, PNG, WebP, HEIC.`,
    );
  }

  // HEIC/HEIF browsers cannot decode via <img src>, skip dimension check
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return { width: 0, height: 0 };
  }

  return new Promise<ImageDimensions>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: width, naturalHeight: height } = img;
      if (width > MAX_IMAGE_DIMENSION_PX || height > MAX_IMAGE_DIMENSION_PX) {
        reject(
          new Error(
            `Image too large (${width}×${height} px). Maximum: ${MAX_IMAGE_DIMENSION_PX} px per side.`,
          ),
        );
      } else {
        resolve({ width, height });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image file. It may be corrupted or unsupported.'));
    };
    img.src = url;
  });
}
