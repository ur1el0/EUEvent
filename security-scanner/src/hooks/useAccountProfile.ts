import { useEffect } from 'react';
import { useSecuritySession } from './useSecuritySession';
import { usePendingScans } from './usePendingScans';
import { useStaffSignOut } from './useStaffSignOut';
import { useStudentSignOut } from './useStudentSignOut';
import { canOpenProfile, getProfileFields, getSignOutNote } from '../services/profileDetails';

/**
 * Profile details and sign-out for the signed-in student or staff account.
 * Staff sign-out warns about scans still waiting on this phone; student sign-out
 * asks for confirmation because it deletes their saved tickets.
 */
export function useAccountProfile() {
  const { user, token, serverUrl, signOut: endSession } = useSecuritySession();
  const isStudent = user?.role === 'student';
  const staffId = isStudent ? undefined : user?.id;
  const queue = usePendingScans(serverUrl, staffId, token);
  const { refreshQueue } = queue;
  const staffSignOut = useStaffSignOut(staffId, queue.pendingScansCount, endSession);
  const studentSignOut = useStudentSignOut(endSession, token);

  // Read how many scans are waiting so the staff sign-out warning is accurate; this never uploads anything.
  useEffect(() => {
    void refreshQueue(false);
  }, [refreshQueue]);

  return {
    canOpen: Boolean(user) && canOpenProfile(user?.role),
    fields: getProfileFields(user),
    signOutNote: getSignOutNote(user?.role),
    isSigningOut: isStudent ? studentSignOut.isSigningOut : staffSignOut.isSigningOut,
    requestSignOut: isStudent ? studentSignOut.request : staffSignOut.signOut,
    /** Confirmation dialog for students; staff use the pending-scans alert instead. */
    signOutDialog: isStudent ? studentSignOut.dialog : null,
  };
}
