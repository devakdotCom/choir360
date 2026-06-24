import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { Role } from '../types';

export interface AuthClaims {
  role?: Role;
  tenantId?: string;
  parishId?: string;
  choirId?: string;
}

export function resolveAuthRole(claims: AuthClaims, user: User | null): Role {
  if (!user) return 'public_user';
  return claims.role ?? 'choir_member';
}

const ROLE_HIERARCHY: Role[] = [
  'public_user',
  'choir_member',
  'choir_admin',
  'parish_admin',
  'diocese_admin',
  'super_admin',
];

function getFriendlyAuthError(error: unknown, fallback: string) {
  const code = (
    error
    && typeof error === 'object'
    && 'code' in error
    && typeof error.code === 'string'
  ) ? error.code : '';

  const messageByCode: Record<string, string> = {
    'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'The sign-in service could not be reached. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled for this app.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
  };

  return messageByCode[code] || fallback;
}

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [claims, setClaims] = useState<AuthClaims>({});
  const [isReady, setIsReady] = useState(!isFirebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsReady(true);
      setAuthError(null);
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult();
        setClaims(token.claims as AuthClaims);
      } else {
        setClaims({});
      }
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, 'Sign in failed. Please try again.'));
      throw error;
    }
  };

  const createAccount = async (email: string, password: string, displayName: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    setAuthError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(credential.user, { displayName });
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, 'Account creation failed. Please try again.'));
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  // Forces a Firebase ID token refresh so newly set custom claims (role,
  // tenantId, parishId, choirId) take effect immediately without sign-out.
  // onIdTokenChanged fires on refresh and re-reads claims into state.
  const refreshToken = async (): Promise<void> => {
    if (auth?.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  };

  const effectiveRole: Role = resolveAuthRole(claims, user);

  return {
    user,
    claims,
    isReady,
    authError,
    isConfigured: isFirebaseConfigured,
    effectiveRole,
    signIn,
    createAccount,
    logout,
    refreshToken,
  };
}
