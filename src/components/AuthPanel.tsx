import React, { useState } from 'react';
import { CheckCircle, KeyRound, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { User } from 'firebase/auth';
import { Role } from '../types';
import { apiFetch } from '../services/apiClient';

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

const AdminActivationPanel: React.FC<{
  onRefreshToken: () => Promise<void>;
  onDone: () => void;
}> = ({ onRefreshToken, onDone }) => {
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await apiFetch('/api/auth/self-claim-choir-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Activation failed.');
      setStatus('success');
      setMessage(data.message || 'Admin access activated!');
      await onRefreshToken();
      setTimeout(onDone, 1800);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Activation failed.');
    }
  };

  if (status === 'success') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3 text-xs font-semibold text-emerald-800">
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleActivate} className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5 text-amber-700" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Activate Admin Access</p>
      </div>
      <p className="text-[10px] text-amber-700 leading-relaxed">
        Your account has no admin role yet. Enter the activation secret to get choir_admin access for this parish.
      </p>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Activation secret"
        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 min-h-[40px]"
        autoComplete="off"
        required
      />
      {status === 'error' && (
        <p className="text-[10px] font-semibold text-rose-600">{message}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {status === 'loading' ? 'Activating...' : 'Activate Admin Access'}
      </button>
    </form>
  );
};

export const AuthPanel: React.FC<AuthPanelProps> = ({
  user,
  isConfigured,
  authError,
  effectiveRole,
  onSignIn,
  onCreateAccount,
  onLogout,
  onRefreshToken,
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
  const [showActivation, setShowActivation] = useState(false);

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
    const needsActivation = effectiveRole === 'choir_member';
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
        {needsActivation && !showActivation && (
          <button
            type="button"
            onClick={() => setShowActivation(true)}
            className="mt-3 flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Activate Admin Access
          </button>
        )}
        {needsActivation && showActivation && (
          <AdminActivationPanel
            onRefreshToken={onRefreshToken}
            onDone={() => setShowActivation(false)}
          />
        )}
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
