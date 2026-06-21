import React from 'react';
import { ShieldX } from 'lucide-react';

interface AccessDeniedProps {
  requiredRole?: string;
  onSignIn?: () => void;
}

/**
 * Shown when a user navigates to a tab they do not have the claim-verified role for.
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRole, onSignIn }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
      <ShieldX className="h-7 w-7 text-rose-600" />
    </div>
    <div>
      <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {requiredRole
          ? `This section requires the ${requiredRole} role or higher. Your access level is verified by Firebase Auth.`
          : 'Please sign in to access this section.'}
      </p>
    </div>
    {onSignIn && (
      <button
        onClick={onSignIn}
        className="rounded-xl bg-[#18392f] px-5 py-2.5 text-sm font-bold text-white shadow"
      >
        Sign in to continue
      </button>
    )}
  </div>
);
