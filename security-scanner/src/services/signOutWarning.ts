// Pure sign-out confirmation copy. Signing out deletes the saved tickets on this phone.

export type SignOutWarning = {
  title: string;
  message: string;
  /** Extra warning shown only while the app is offline. */
  offlineWarning: string | null;
  confirmLabel: string;
};

export function getSignOutWarning(isOffline: boolean): SignOutWarning {
  if (isOffline) {
    return {
      title: 'Sign out while offline?',
      message: 'Signing out deletes the tickets saved on this phone.',
      offlineWarning: 'You can’t sign back in without a connection; you’ll lose your ticket on this phone until then.',
      confirmLabel: 'Sign out anyway',
    };
  }

  return {
    title: 'Sign out?',
    message: 'Signing out deletes the tickets saved on this phone. They come back when you sign in again while connected.',
    offlineWarning: null,
    confirmLabel: 'Sign out',
  };
}
