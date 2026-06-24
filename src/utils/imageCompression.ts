/**
 * Canvas-based image compression — no external library required.
 *
 * Strategy:
 *  - If the file is already ≤ TARGET_MAX_BYTES AND both dimensions fit within
 *    TARGET_MAX_PX, return the original file unchanged.
 *  - Otherwise, draw to a canvas scaled to fit within TARGET_MAX_PX while
 *    preserving aspect ratio, then export as JPEG (or PNG if the input was PNG).
 *  - HEIC/HEIF cannot be decoded by the browser canvas in most environments,
 *    so those are passed through unchanged (Cloudinary handles them server-side).
 */

const TARGET_MAX_PX = 1200;       // max dimension after resize
const TARGET_QUALITY = 0.82;      // JPEG quality factor
const TARGET_MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB — compress if larger

export async function compressImage(file: File): Promise<File> {
  // HEIC/HEIF — browser canvas can't decode; pass through unchanged
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }

  const url = URL.createObjectURL(file);

  try {
    const img = await loadImage(url);
    const { naturalWidth: w, naturalHeight: h } = img;
    const needsResize = w > TARGET_MAX_PX || h > TARGET_MAX_PX;
    const needsCompression = file.size > TARGET_MAX_BYTES;

    if (!needsResize && !needsCompression) {
      return file; // already small enough
    }

    const scale = needsResize ? Math.min(TARGET_MAX_PX / w, TARGET_MAX_PX / h) : 1;
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    return await drawToCanvas(img, outW, outH, file.name, file.type);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image compression failed: could not load image.'));
    img.src = src;
  });
}

function drawToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  originalName: string,
  mimeType: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available — compression skipped.'));
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Keep PNG as PNG (transparency), everything else as JPEG
    const outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outputType === 'image/jpeg' ? TARGET_QUALITY : undefined;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas compression produced an empty blob.'));
          return;
        }
        // Give the compressed file a sensible extension
        const ext = outputType === 'image/png' ? '.png' : '.jpg';
        const baseName = originalName.replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${baseName}${ext}`, { type: outputType }));
      },
      outputType,
      quality,
    );
  });
}
