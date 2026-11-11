import { useEffect } from 'react';
import { useSecuritySession } from './useSecuritySession';
import { usePendingScans } from './usePendingScans';
import { useStaffSignOut } from './useStaffSignOut';
import { getProfileEmailText, getRoleLabel } from '../services/profileDetails';

/** Profile details plus a sign-out that still warns about scans waiting on this phone. */
export function useStaffProfile() {
  const { user, token, serverUrl, signOut: endSession } = useSecuritySession();
  const queue = usePendingScans(serverUrl, user?.id, token);
  const { refreshQueue } = queue;
  const { isSigningOut, signOut } = useStaffSignOut(user?.id, queue.pendingScansCount, endSession);

  // Read how many scans are waiting so the sign-out warning is accurate; this never uploads anything.
  useEffect(() => {
    void refreshQueue(false);
  }, [refreshQueue]);

  return {
    name: user?.name ?? '',
    emailText: getProfileEmailText(user?.email),
    roleLabel: getRoleLabel(user?.role),
    isSigningOut,
    signOut,
  };
}
