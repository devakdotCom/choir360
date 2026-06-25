import React, { useState } from 'react';
import { LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { User } from 'firebase/auth';
import { Role } from '../types';

interface AuthPanelProps {
  user: User | null;
  isConfigured: boolean;
  authError: string | null;
  effectiveRole: Role;
  onSignIn: (email: string, password: string) => Promise<void>;
  onCreateAccount: (email: string, password: string, displayName: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefreshToken: () => Promise<void>;
  onOpenRegistration?: () => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  user,
  isConfigured,
  authError,
  effectiveRole,
  onSignIn,
  onCreateAccount,
  onLogout,
  onOpenRegistration,
}) => {
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    if (mode === 'create' && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
        await onCreateAccount(email, password, displayName);
        onOpenRegistration?.();
      }
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'create' : 'signin');
    setPassword('');
    setConfirmPassword('');
    setLocalError('');
  };

  if (!isConfigured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        Live sign in is not configured. The app is running in local demo mode.
      </div>
    );
  }

  if (user && !user.isAnonymous) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{user.displayName || user.email}</p>
            <p className="text-[10px] font-semibold text-emerald-700">
              {effectiveRole.replace(/_/g, ' ')} &middot; live sync active
            </p>
          </div>
        </div>
        <button
          onClick={() => void onLogout()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 min-h-[44px] text-xs font-bold text-slate-700"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">{mode === 'signin' ? 'Sign in' : 'Create account'}</p>
          <p className="text-[10px] text-slate-500">
            {mode === 'signin' ? 'Use your registered choir email' : 'Create login, then complete member form'}
          </p>
        </div>
        <button
          type="button"
          onClick={switchMode}
          className="text-[10px] font-bold text-emerald-700 min-h-[44px] flex items-center px-2"
        >
          {mode === 'signin' ? 'Create account' : 'Sign in'}
        </button>
      </div>
      {mode === 'create' && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[44px] text-xs outline-none focus:border-emerald-500"
            required
          />
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[44px] text-xs outline-none focus:border-emerald-500"
            required
          />
        </div>
      )}
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Registered email address"
        autoComplete="email"
        className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[44px] text-xs outline-none focus:border-emerald-500"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        minLength={mode === 'create' ? 8 : undefined}
        className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[44px] text-xs outline-none focus:border-emerald-500"
        required
      />
      {mode === 'create' && (
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          autoComplete="new-password"
          minLength={8}
          className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[44px] text-xs outline-none focus:border-emerald-500"
          required
        />
      )}
      {(localError || authError) && (
        <p className="mb-2 text-[10px] font-semibold text-rose-600">{localError || authError}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18392f] px-3 py-3 min-h-[44px] text-xs font-bold text-white disabled:opacity-60"
      >
        {mode === 'signin' ? <LogIn className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
        {isSubmitting ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
    </form>
  );
};
