/**
 * GamificationEngine – XP, level calculation, badge logic and streak tracking.
 * Bronze → Silver → Gold → Platinum → Diamond → Legend
 */
import type { Member } from '../types';

export type GamificationLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Legend';

export interface GamificationBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  xpReward: number;
  earnedDate?: string;
}

export interface GamificationProfile {
  memberId: string;
  displayName: string;
  totalXP: number;
  level: GamificationLevel;
  levelXP: number;          // XP within current level
  nextLevelXP: number;      // XP needed for next level
  progressPct: number;      // 0-100
  badges: GamificationBadge[];
  streak: number;           // consecutive months with >75% attendance
  rank?: number;            // rank within choir
}

// ─── Level thresholds ────────────────────────────────────────────────────────
export const LEVEL_THRESHOLDS: Record<GamificationLevel, number> = {
  Bronze:   0,
  Silver:   500,
  Gold:     1500,
  Platinum: 3000,
  Diamond:  6000,
  Legend:   12000,
};

export const LEVEL_ORDER: GamificationLevel[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'];

export const LEVEL_COLORS: Record<GamificationLevel, { bg: string; text: string; border: string; emoji: string }> = {
  Bronze:   { bg: 'from-amber-700 to-amber-600',    text: 'text-amber-100', border: 'border-amber-500',  emoji: '🥉' },
  Silver:   { bg: 'from-slate-500 to-slate-400',    text: 'text-slate-100', border: 'border-slate-300',  emoji: '🥈' },
  Gold:     { bg: 'from-yellow-600 to-yellow-500',  text: 'text-yellow-100',border: 'border-yellow-400', emoji: '🥇' },
  Platinum: { bg: 'from-cyan-700 to-cyan-600',      text: 'text-cyan-100',  border: 'border-cyan-400',   emoji: '💎' },
  Diamond:  { bg: 'from-violet-700 to-violet-600',  text: 'text-violet-100',border: 'border-violet-400', emoji: '💠' },
  Legend:   { bg: 'from-rose-700 via-amber-600 to-yellow-500', text: 'text-white', border: 'border-amber-300', emoji: '👑' },
};

// ─── XP Calculation ──────────────────────────────────────────────────────────
function calcXP(member: Member): number {
  let xp = 0;
  const yearsActive = new Date().getFullYear() - new Date(member.joiningDate || '2023-01-01').getFullYear();

  // Base: 100 XP per year active
  xp += yearsActive * 100;

  // Attendance bonus: up to 300 XP based on attendance rate
  const rate = member.attendanceRate ?? 80;
  xp += Math.floor((rate / 100) * 300);

  // Role bonus
  const voiceXP: Record<string, number> = { Soprano: 50, Alto: 50, Tenor: 60, Bass: 60, None: 30 };
  const typeXP: Record<string, number> = { Singer: 40, Keyboard: 70, Guitar: 65, Violin: 70, Flute: 65, Tabla: 60, Pad: 55, Drums: 60, Other: 40 };
  xp += (voiceXP[member.voiceType] ?? 30) + (typeXP[member.memberType] ?? 40);

  // Status bonus
  if (member.status === 'Active Member') xp += 200;
  if (member.status === 'Approved') xp += 100;

  // Experience bonus (50 XP per year of experience)
  xp += (member.experience ?? 0) * 50;

  return Math.max(0, xp);
}

function calcLevel(xp: number): GamificationLevel {
  let level: GamificationLevel = 'Bronze';
  for (const lvl of LEVEL_ORDER) {
    if (xp >= LEVEL_THRESHOLDS[lvl]) level = lvl;
    else break;
  }
  return level;
}

function calcLevelProgress(xp: number, level: GamificationLevel): { levelXP: number; nextLevelXP: number; progressPct: number } {
  const idx = LEVEL_ORDER.indexOf(level);
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = idx < LEVEL_ORDER.length - 1 ? LEVEL_THRESHOLDS[LEVEL_ORDER[idx + 1]] : currentThreshold + 5000;
  const levelXP = xp - currentThreshold;
  const nextLevelXP = nextThreshold - currentThreshold;
  const progressPct = Math.min(100, Math.round((levelXP / nextLevelXP) * 100));
  return { levelXP, nextLevelXP, progressPct };
}

// ─── Badge Definitions ───────────────────────────────────────────────────────
export function deriveBadges(member: Member): GamificationBadge[] {
  const yearsActive = new Date().getFullYear() - new Date(member.joiningDate || '2023-01-01').getFullYear();
  const rate = member.attendanceRate ?? 80;
  const isPreFounder = new Date(member.joiningDate || '2025-01-01') <= new Date('2021-12-31');

  return [
    {
      id: 'faithful_servant',
      name: 'Faithful Servant',
      emoji: '🕊️',
      description: 'Member for 1+ year',
      earned: yearsActive >= 1,
      xpReward: 100,
      earnedDate: yearsActive >= 1 ? member.joiningDate : undefined,
    },
    {
      id: 'veteran',
      name: 'Choir Veteran',
      emoji: '⭐',
      description: 'Member for 5+ years',
      earned: yearsActive >= 5,
      xpReward: 300,
    },
    {
      id: 'decade_champion',
      name: 'Decade Champion',
      emoji: '🏆',
      description: 'Member for 10+ years',
      earned: yearsActive >= 10,
      xpReward: 600,
    },
    {
      id: 'founding_member',
      name: 'Founding Member',
      emoji: '🌟',
      description: 'Joined before 2022 — helped build the choir',
      earned: isPreFounder,
      xpReward: 400,
    },
    {
      id: 'star_attendee',
      name: 'Star Attendee',
      emoji: '🎵',
      description: '80%+ attendance rate',
      earned: rate >= 80,
      xpReward: 200,
    },
    {
      id: 'perfect_attendance',
      name: 'Perfect Attendance',
      emoji: '💯',
      description: '95%+ attendance rate',
      earned: rate >= 95,
      xpReward: 400,
    },
    {
      id: 'active_member',
      name: 'Active Member',
      emoji: '🎤',
      description: 'Currently active status',
      earned: member.status === 'Active Member',
      xpReward: 150,
    },
    {
      id: 'section_leader',
      name: 'Section Leader',
      emoji: '🎼',
      description: 'Instrumentalist with 5+ years experience',
      earned: (member.memberType !== 'Singer') && (member.experience ?? 0) >= 5,
      xpReward: 250,
    },
    {
      id: 'voice_maestro',
      name: 'Voice Maestro',
      emoji: '🎭',
      description: '10+ years of singing experience',
      earned: (member.experience ?? 0) >= 10,
      xpReward: 350,
    },
    {
      id: 'all_rounder',
      name: 'All Rounder',
      emoji: '🌈',
      description: 'High attendance + long service',
      earned: rate >= 85 && yearsActive >= 3,
      xpReward: 300,
    },
  ];
}

// ─── Build full profile ──────────────────────────────────────────────────────
export function buildGamificationProfile(
  member: Member,
  rank?: number,
): GamificationProfile {
  const totalXP = calcXP(member);
  const level = calcLevel(totalXP);
  const { levelXP, nextLevelXP, progressPct } = calcLevelProgress(totalXP, level);
  const badges = deriveBadges(member);

  // Simple streak: approximate from attendance rate & years active
  const rate = member.attendanceRate ?? 80;
  const streak = rate >= 75 ? Math.floor((member.experience ?? 1) * 0.8) : 0;

  return {
    memberId: member.id,
    displayName: `${member.firstName} ${member.lastName}`,
    totalXP,
    level,
    levelXP,
    nextLevelXP,
    progressPct,
    badges,
    streak,
    rank,
  };
}
