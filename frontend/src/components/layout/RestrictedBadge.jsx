import React from 'react';
import { Lock } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

/**
 * RestrictedBadge wraps sensitive content.
 * It renders a visual badge (and optionally redacts the content completely)
 * if the user's role is not in the allowed list.
 */
const RestrictedBadge = ({ children, allowedRoles, fallback = "Restricted", className }) => {
  const { user } = useAuth();
  const isAllowed = allowedRoles.includes(user.role);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className={clsx("inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium", className)}>
      <Lock className="w-3 h-3 mr-1.5 opacity-70" />
      {fallback}
    </div>
  );
};

export default RestrictedBadge;
