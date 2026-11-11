import { useState } from 'react';
import { ApiError } from '../services/apiClient';
import { fetchCurrentUser } from '../services/auth';
import { getSignOutWarning } from '../services/signOutWarning';

/**
 * Students always confirm before signing out, because it deletes their saved tickets on this phone.
 * The confirmation also checks whether the server is reachable, so it can warn that signing back in
 * needs a connection.
 */
export function useStudentSignOut(endSession: () => Promise<void>, token: string | null) {
  const [isChecking, setIsChecking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const warning = getSignOutWarning(isOffline);

  async function request() {
    if (isChecking || isSigningOut) return;

    setIsChecking(true);
    let offline = false;
    if (token) {
      try {
        await fetchCurrentUser(token);
      } catch (cause) {
        // A 401 means the server answered. Anything else that is not a normal API reply means it did not.
        offline = !(cause instanceof ApiError) || cause.status >= 500;
      }
    }
    setIsOffline(offline);
    setIsConfirming(true);
    setIsChecking(false);
  }

  async function confirm() {
    setIsSigningOut(true);
    try {
      await endSession();
    } finally {
      setIsSigningOut(false);
      setIsConfirming(false);
    }
  }

  return {
    isSigningOut,
    request: () => void request(),
    dialog: {
      visible: isConfirming,
      title: warning.title,
      message: warning.message,
      warning: warning.offlineWarning,
      confirmLabel: warning.confirmLabel,
      busy: isSigningOut,
      onConfirm: () => void confirm(),
      onCancel: () => setIsConfirming(false),
    },
  };
}
