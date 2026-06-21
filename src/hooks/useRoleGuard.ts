import { useMemo } from 'react';
import { Role } from '../types';
import { hasMinimumRole } from './useFirebaseAuth';

/**
 * Centralised access-control hook.
 * All authorization decisions in the UI flow through here.
 * Server-side Firestore rules and API middleware are the real enforcement layer;
 * this hook drives what the UI renders so users are not shown controls they cannot use.
 */
export function useRoleGuard(effectiveRole: Role) {
  return useMemo(() => ({
    /** True when the user has at least choir_admin privileges (server-verified). */
    isAdmin: hasMinimumRole(effectiveRole, 'choir_admin'),

    /** True when the user is an authenticated choir member or higher. */
    isMember: hasMinimumRole(effectiveRole, 'choir_member'),

    /** True when the user is parish admin or higher. */
    isParishAdmin: hasMinimumRole(effectiveRole, 'parish_admin'),

    /** True when the user is diocese admin or higher. */
    isDioceseAdmin: hasMinimumRole(effectiveRole, 'diocese_admin'),

    /** True when the user is super admin. */
    isSuperAdmin: effectiveRole === 'super_admin',

    /** Convenience: the resolved role string. */
    role: effectiveRole,

    /**
     * Guards a tab by minimum required role.
     * Returns true if the current user may access the tab.
     */
    canAccess(requiredRole: Role): boolean {
      return hasMinimumRole(effectiveRole, requiredRole);
    },
  }), [effectiveRole]);
}
