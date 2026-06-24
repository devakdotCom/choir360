/**
 * ProfilePhotoUpload
 *
 * Flow:
 *  1. User selects a file  →  validated immediately (type / size / dimensions)
 *  2. Valid file           →  Base64 preview rendered instantly (no server call yet)
 *  3. User clicks "Upload" →  image is compressed, uploaded to Cloudinary via
 *                             signed backend endpoint, metadata saved to Firestore
 *  4. Success              →  preview updated with Cloudinary optimized URL
 *
 * Base64 data is used ONLY for the in-browser preview and is never persisted.
 */

import React, { useRef, useState } from 'react';
import { Camera, CheckCircle, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { fileToBase64 } from '../../utils/fileToBase64';
import { validateImageFile } from '../../utils/imageValidation';
import { compressImage } from '../../utils/imageCompression';
import { uploadMediaToCloudinary } from '../../services/cloudinary';
import type { CloudinaryMediaRecord } from '../../types';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProfilePhotoUploadProps {
  /** Firestore ID of the member record this photo belongs to */
  memberId: string;
  /** Firebase UID or 'public_user' for unauthenticated registrants */
  uploadedByUserId: string;
  /** Current photo URL shown as the initial preview (avatar or previous upload) */
  currentPhotoUrl?: string;
  /** Called when the Cloudinary upload and Firestore write have completed */
  onUploadComplete: (record: CloudinaryMediaRecord) => void;
  /** Called when validation or upload fails */
  onError?: (message: string) => void;
}

// ── Internal state machine ────────────────────────────────────────────────────

type UploadPhase =
  | 'idle'        // no file selected
  | 'preview'     // file selected, Base64 preview shown, not yet uploaded
  | 'uploading'   // compression + Cloudinary upload in progress
  | 'success'     // upload completed
  | 'error';      // validation or upload failed

// ── Component ─────────────────────────────────────────────────────────────────

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  memberId,
  uploadedByUserId,
  currentPhotoUrl,
  onUploadComplete,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<UploadPhase>('idle');
  /** Displayed image URL — starts as `currentPhotoUrl`, transitions to Base64 preview,
   *  then to the Cloudinary optimized URL after a successful upload. */
  const [displayUrl, setDisplayUrl] = useState(currentPhotoUrl ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setProgressMsg('Validating…');
    setPhase('preview');

    try {
      // Validate — throws on failure
      await validateImageFile(file);

      // Generate Base64 preview immediately
      const base64 = await fileToBase64(file);
      setDisplayUrl(base64);
      setSelectedFile(file);
      setProgressMsg('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Validation failed.';
      setErrorMsg(msg);
      onError?.(msg);
      setPhase('error');
      setProgressMsg('');
      // Reset input so the same file can be re-selected after fixing
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setPhase('uploading');
    setProgressMsg('Compressing image…');

    try {
      const compressed = await compressImage(selectedFile);

      setProgressMsg('Uploading to Cloudinary…');
      const record = await uploadMediaToCloudinary(compressed, {
        moduleName: 'members',
        relatedRecordId: memberId,
        uploadedByUserId,
        originalFileName: selectedFile.name,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      // Replace Base64 preview with the Cloudinary CDN URL
      setDisplayUrl(record.optimizedUrl || record.secureUrl);
      setPhase('success');
      setProgressMsg('');
      onUploadComplete(record);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setErrorMsg(msg);
      onError?.(msg);
      setPhase('error');
      setProgressMsg('');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setDisplayUrl(currentPhotoUrl ?? '');
    setSelectedFile(null);
    setErrorMsg('');
    setProgressMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Photo preview + controls row */}
      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div className="relative shrink-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile preview"
              className="h-20 w-20 rounded-xl border-2 border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100">
              <Camera className="h-8 w-8 text-slate-400" />
            </div>
          )}

          {/* Uploading spinner overlay */}
          {phase === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}

          {/* Success badge */}
          {phase === 'success' && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5 shadow">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleFileChange}
            disabled={phase === 'uploading'}
          />

          {/* Choose File */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={phase === 'uploading'}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {displayUrl && phase === 'idle' ? 'Change Photo' : 'Choose File'}
          </button>

          {/* Upload / Cancel — shown only when a file is selected and not yet uploaded */}
          {phase === 'preview' && selectedFile && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpload}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-amber-700 px-3 text-xs font-bold text-white transition hover:bg-amber-600"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          )}

          {/* Retry — shown after an error */}
          {phase === 'error' && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {progressMsg && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {progressMsg}
        </p>
      )}
      {phase === 'success' && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3.5 w-3.5" />
          Photo uploaded successfully.
        </p>
      )}
      {phase === 'preview' && selectedFile && !progressMsg && (
        <p className="text-[10px] font-semibold text-slate-600">
          Selected: {selectedFile.name}
        </p>
      )}
      {errorMsg && (
        <p className="text-xs font-semibold text-rose-600">⚠ {errorMsg}</p>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] leading-relaxed text-emerald-800">
        Uploaded images go to Cloudinary first; the returned public ID, secure URL, thumbnail URL,
        optimized URL, upload timestamp, module name, related member ID, and uploader ID are then
        written to Firebase. JPEG/PNG/WebP/HEIC only, max 8 MB, max 6000 px per side.
      </p>
    </div>
  );
};
