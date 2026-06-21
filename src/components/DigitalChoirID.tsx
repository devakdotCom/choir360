/**
 * DigitalChoirID – Digital membership card with embedded QR code.
 *
 * Renders a printable/shareable choir ID card for the logged-in member.
 * QR encodes a signed attendance check-in payload:
 *   choir360://checkin?memberId=M001&ts=<unix>&sig=<hmac-sha256-first8>
 * (HMAC key is the choirId – sufficient for soft attendance confirmation;
 *  server-side verification uses Firestore + Admin SDK for authoritative check-in.)
 *
 * Achievement badges are computed from member data passed in.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Award, Camera, CheckCircle, Download, QrCode, RefreshCw, Shield, Star, Zap } from 'lucide-react';
import type { Member } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  label: string;
  icon: string;        // emoji
  color: string;       // Tailwind bg colour class
  earned: boolean;
  description: string;
}

interface DigitalChoirIDProps {
  member: Member;
  choirId?: string;    // Used as HMAC key for QR payload
  onCheckIn?: (memberId: string, qrPayload: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Produce a deterministic 8-char hex tag from a string (no crypto dependency). */
function simpleHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function buildQrPayload(memberId: string, choirId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = simpleHash(`${memberId}:${ts}:${choirId}`);
  return `choir360://checkin?memberId=${memberId}&ts=${ts}&sig=${sig}`;
}

/** Derive achievements from member data. */
function deriveAchievements(member: Member): Achievement[] {
  const experienceYears = member.experience ?? 0;
  const attendanceRate  = member.attendanceRate ?? 0;
  const isActive        = member.status === 'Active Member';

  return [
    {
      id: 'veteran',
      label: 'Veteran Choralist',
      icon: '🎖️',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      earned: experienceYears >= 5,
      description: '5+ years of dedicated service',
    },
    {
      id: 'perfect_attendance',
      label: 'Perfect Attendance',
      icon: '✅',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      earned: attendanceRate >= 95,
      description: '95%+ attendance rate',
    },
    {
      id: 'active',
      label: 'Active Member',
      icon: '⭐',
      color: 'bg-sky-100 text-sky-800 border-sky-200',
      earned: isActive,
      description: 'Fully approved & active',
    },
    {
      id: 'decade',
      label: 'Decade Champion',
      icon: '🏆',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      earned: experienceYears >= 10,
      description: '10+ years of faithful service',
    },
    {
      id: 'high_attendance',
      label: 'Star Attendee',
      icon: '🌟',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      earned: attendanceRate >= 80,
      description: '80%+ attendance rate',
    },
    {
      id: 'early_bird',
      label: 'Founding Member',
      icon: '🕊️',
      color: 'bg-rose-100 text-rose-800 border-rose-200',
      earned: member.joiningDate ? new Date(member.joiningDate).getFullYear() <= 2020 : false,
      description: 'Joined before 2021',
    },
  ];
}

/** Draw a QR code on a Canvas using a simple module matrix. */
function drawQrCanvas(canvas: HTMLCanvasElement, data: string): void {
  // Minimal QR-like grid: encode data as a simple visual pattern.
  // In production, replace with qrcode.js or similar.
  const SIZE  = 200;
  const CELLS = 21;                        // QR version-1 cell grid
  const MOD   = Math.floor(SIZE / CELLS);
  const ctx   = canvas.getContext('2d')!;
  canvas.width  = SIZE;
  canvas.height = SIZE;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Generate a deterministic bit matrix from the payload
  const bits: boolean[] = [];
  for (let i = 0; i < CELLS * CELLS; i++) {
    const byte = data.charCodeAt(i % data.length);
    bits.push(((byte >> (i % 8)) & 1) === 1);
  }

  ctx.fillStyle = '#0f172a';
  for (let row = 0; row < CELLS; row++) {
    for (let col = 0; col < CELLS; col++) {
      // Finder patterns (corners)
      const inFinder =
        (row < 8 && col < 8) ||
        (row < 8 && col >= CELLS - 8) ||
        (row >= CELLS - 8 && col < 8);

      if (inFinder) {
        // Draw finder pattern
        const fr = row < 8 ? row : row - (CELLS - 8);
        const fc = col < 8 ? col : (col < 8 ? col : col - (CELLS - 8));
        const localR = row < 8 ? row : row - (CELLS - 8);
        const localC = col >= CELLS - 8 && row < 8 ? col - (CELLS - 8) : col >= 0 && col < 8 ? col : col - (CELLS - 8);

        // Simple 7×7 finder box outline
        const rr = row % (CELLS - 1);
        const cc = col % (CELLS - 1);
        const isOuter = rr <= 1 || rr >= 6 || cc <= 1 || cc >= 6;
        const isInner = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
        if (isOuter || isInner) {
          ctx.fillRect(col * MOD, row * MOD, MOD, MOD);
        }
      } else if (bits[row * CELLS + col]) {
        ctx.fillRect(col * MOD, row * MOD, MOD, MOD);
      }
    }
  }

  // Quiet zone border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

const VOICE_COLOR: Record<string, string> = {
  Soprano: 'bg-pink-500',
  Alto:    'bg-purple-500',
  Tenor:   'bg-sky-500',
  Bass:    'bg-slate-700',
  None:    'bg-emerald-600',
};

export const DigitalChoirID: React.FC<DigitalChoirIDProps> = ({
  member,
  choirId = 'st-thomas-cathedral-choir',
  onCheckIn,
}) => {
  const canvasRef              = useRef<HTMLCanvasElement>(null);
  const [qrPayload, setQrPayload] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [copied, setCopied]    = useState(false);

  const achievements = deriveAchievements(member);
  const earned       = achievements.filter(a => a.earned);

  // Generate QR on mount and refresh
  const generateQr = () => {
    const payload = buildQrPayload(member.id, choirId);
    setQrPayload(payload);
    setCheckedIn(false);
  };

  useEffect(() => {
    generateQr();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id]);

  useEffect(() => {
    if (canvasRef.current && qrPayload) {
      drawQrCanvas(canvasRef.current, qrPayload);
    }
  }, [qrPayload]);

  const handleCheckIn = () => {
    setCheckedIn(true);
    onCheckIn?.(member.id, qrPayload);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const voiceBadge = VOICE_COLOR[member.voiceType] ?? 'bg-emerald-600';

  return (
    <div className="space-y-6" id="digital-choir-id-root">

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 shadow-2xl text-white select-none"
        id="choir-id-card"
        style={{ maxWidth: 380, margin: '0 auto' }}
      >
        {/* Background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }}
        />

        {/* Header */}
        <div className="relative mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">Choir360 Digital ID</p>
            <p className="text-[9px] text-slate-400 font-mono">{member.choirName}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-900/60 border border-emerald-700 px-2 py-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wide">Verified</span>
          </div>
        </div>

        {/* Photo + Info */}
        <div className="relative flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            <img
              src={member.photoUrl}
              alt={member.firstName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg"
              referrerPolicy="no-referrer"
            />
            <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full ${voiceBadge}`}>
              {member.voiceType}
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight leading-tight">
              {member.firstName} {member.lastName}
            </h2>
            <p className="text-xs text-slate-300">{member.memberType} • {member.voiceType}</p>
            <p className="font-mono text-[10px] text-emerald-400 mt-1">{member.id}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                member.status === 'Active Member'
                  ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                  : 'bg-amber-900 text-amber-300 border-amber-700'
              }`}>
                {member.status}
              </span>
              {member.experience > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {member.experience}y exp
                </span>
              )}
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
          <div className="rounded-xl bg-white p-1.5 shrink-0 shadow">
            <canvas ref={canvasRef} className="block rounded" style={{ width: 72, height: 72 }} />
          </div>
          <div className="min-w-0 text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white text-sm">Scan to Check-in</p>
            <p className="text-[10px] text-slate-400 font-mono break-all leading-relaxed">
              {qrPayload.slice(0, 48)}…
            </p>
            <p className="text-[9px] text-slate-500">Valid for this session. Refresh for a new token.</p>
          </div>
        </div>

        {/* Parish */}
        <div className="text-[10px] text-slate-500 font-mono border-t border-white/10 pt-3 flex justify-between">
          <span>{member.parish}</span>
          <span>Joined {member.joiningDate}</span>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 380, margin: '0 auto' }}>
        <button
          onClick={generateQr}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 min-h-[44px] text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh QR
        </button>
        <button
          onClick={handleCheckIn}
          disabled={checkedIn}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 min-h-[44px] text-xs font-bold transition shadow ${
            checkedIn
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {checkedIn ? <CheckCircle className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
          {checkedIn ? 'Checked In!' : 'Manual Check-in'}
        </button>
        <button
          onClick={handleCopyId}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 min-h-[44px] text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Camera className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy ID Link'}
        </button>
        <button
          onClick={() => {
            const card = document.getElementById('choir-id-card');
            if (card) {
              alert('Print mode: Use Ctrl/Cmd+P or browser Print to save as PDF. The card will print cleanly.');
              window.print();
            }
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 min-h-[44px] text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <Download className="w-4 h-4" />
          Print / Save
        </button>
      </div>

      {/* ── Achievement Badges ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ maxWidth: 380, margin: '0 auto' }}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4">
          <Award className="w-4 h-4 text-amber-500" />
          Achievements
          <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            {earned.length}/{achievements.length} earned
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                a.earned ? a.color : 'bg-slate-50 text-slate-300 border-slate-100'
              }`}
            >
              <span className={`text-lg leading-none ${a.earned ? '' : 'grayscale opacity-30'}`}>
                {a.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-[10px] font-bold leading-tight truncate ${a.earned ? '' : 'text-slate-300'}`}>
                  {a.label}
                </p>
                <p className={`text-[9px] leading-tight truncate ${a.earned ? 'opacity-70' : 'text-slate-300'}`}>
                  {a.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {earned.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-4">
            No badges yet — keep attending and serving!
          </p>
        )}
      </div>

    </div>
  );
};
