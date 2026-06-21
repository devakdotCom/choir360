import React, { useState } from 'react';
import { Award, TrendingUp, Flame, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import type { Member } from '../types';
import {
  buildGamificationProfile,
  LEVEL_COLORS,
  LEVEL_ORDER,
  LEVEL_THRESHOLDS,
  type GamificationProfile,
} from '../services/GamificationEngine';

interface GamificationProfileProps {
  member: Member;
  allMembers?: Member[];
}

const LeaderboardRow: React.FC<{ profile: GamificationProfile; isCurrentUser: boolean }> = ({
  profile, isCurrentUser,
}) => {
  const colors = LEVEL_COLORS[profile.level];
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3 ${
        isCurrentUser ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-slate-50'
      }`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-black text-slate-600">
        #{profile.rank ?? '—'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{profile.displayName}</p>
        <p className="text-[11px] text-slate-500">
          {colors.emoji} {profile.level} · {profile.totalXP.toLocaleString()} XP
        </p>
      </div>
      {isCurrentUser && (
        <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">YOU</span>
      )}
    </div>
  );
};

export const GamificationProfileView: React.FC<GamificationProfileProps> = ({
  member,
  allMembers = [],
}) => {
  const [showBadges, setShowBadges] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Build profiles for leaderboard
  const allProfiles = [member, ...allMembers.filter((m) => m.id !== member.id)]
    .map((m) => buildGamificationProfile(m))
    .sort((a, b) => b.totalXP - a.totalXP)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const myProfile = allProfiles.find((p) => p.memberId === member.id) ?? buildGamificationProfile(member, 1);
  const colors = LEVEL_COLORS[myProfile.level];
  const earnedBadges = myProfile.badges.filter((b) => b.earned);
  const unearnedBadges = myProfile.badges.filter((b) => !b.earned);

  return (
    <div className="space-y-4">
      {/* Level Card */}
      <div
        className={`rounded-3xl bg-gradient-to-br ${colors.bg} p-6 text-white shadow-xl`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${colors.text} opacity-80`}>
              Current Level
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-4xl">{colors.emoji}</span>
              <span className="text-3xl font-black">{myProfile.level}</span>
            </div>
            {myProfile.rank && (
              <p className={`mt-1 text-xs ${colors.text} opacity-80`}>
                Choir Rank #{myProfile.rank}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{myProfile.totalXP.toLocaleString()}</p>
            <p className={`text-xs font-semibold ${colors.text} opacity-80`}>Total XP</p>
            <div className="mt-2 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-300" />
              <span className="text-sm font-bold">{myProfile.streak}mo streak</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {myProfile.level !== 'Legend' && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-semibold opacity-80">
              <span>{myProfile.levelXP.toLocaleString()} XP</span>
              <span>{myProfile.nextLevelXP.toLocaleString()} XP to next</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-1000"
                style={{ width: `${myProfile.progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] font-bold opacity-70">
              {myProfile.progressPct}% to{' '}
              {LEVEL_ORDER[LEVEL_ORDER.indexOf(myProfile.level) + 1]}
            </p>
          </div>
        )}
      </div>

      {/* Level Roadmap */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-black text-slate-900">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          Level Roadmap
        </h3>
        <div className="space-y-2">
          {LEVEL_ORDER.map((lvl) => {
            const c = LEVEL_COLORS[lvl];
            const isCurrentLevel = lvl === myProfile.level;
            const isPast = myProfile.totalXP >= LEVEL_THRESHOLDS[lvl];
            return (
              <div
                key={lvl}
                className={`flex items-center gap-3 rounded-xl p-2 ${
                  isCurrentLevel ? 'bg-violet-50 ring-2 ring-violet-300' : ''
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isCurrentLevel ? 'text-violet-800' : 'text-slate-700'}`}>
                    {lvl} {isCurrentLevel && '← You are here'}
                  </p>
                  <p className="text-xs text-slate-500">{LEVEL_THRESHOLDS[lvl].toLocaleString()} XP</p>
                </div>
                {isPast && <span className="text-[11px] font-bold text-green-600">✓ Reached</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <button
          onClick={() => setShowBadges(!showBadges)}
          className="flex w-full items-center justify-between min-h-[44px]"
        >
          <h3 className="flex items-center gap-2 font-black text-slate-900">
            <Award className="h-4 w-4 text-amber-600" />
            Achievement Badges
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {earnedBadges.length}/{myProfile.badges.length}
            </span>
          </h3>
          {showBadges ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showBadges && (
          <div className="mt-3 space-y-3">
            {/* Earned */}
            {earnedBadges.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-green-700">
                  Earned ({earnedBadges.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 rounded-xl bg-green-50 p-3 border border-green-100"
                    >
                      <span className="text-2xl">{badge.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800">{badge.name}</p>
                        <p className="text-[10px] text-slate-500">+{badge.xpReward} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unearned */}
            {unearnedBadges.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Locked ({unearnedBadges.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {unearnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 opacity-50"
                    >
                      <span className="text-2xl grayscale">{badge.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-600">{badge.name}</p>
                        <p className="text-[10px] text-slate-400">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="flex w-full items-center justify-between min-h-[44px]"
        >
          <h3 className="flex items-center gap-2 font-black text-slate-900">
            <Trophy className="h-4 w-4 text-amber-500" />
            Choir Leaderboard
          </h3>
          {showLeaderboard ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showLeaderboard && (
          <div className="mt-3 space-y-2">
            {allProfiles.slice(0, 10).map((p) => (
              <LeaderboardRow
                key={p.memberId}
                profile={p}
                isCurrentUser={p.memberId === member.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
