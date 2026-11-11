import { useState } from 'react';
import { Alert } from 'react-native';

/** Signs staff out, warning first when scans are still waiting on this phone. */
export function useStaffSignOut(staffId: number | undefined, pendingScansCount: number, endSession: () => Promise<void>) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (staffId && pendingScansCount > 0) {
      Alert.alert(
        'Scans are waiting to sync',
        `${pendingScansCount} validated ${pendingScansCount === 1 ? 'scan is' : 'scans are'} still encrypted on this device. Signing out keeps them here for this staff account to sync later.`,
        [
          { text: 'Stay signed in', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: () => {
              setIsSigningOut(true);
              void endSession().finally(() => setIsSigningOut(false));
            },
          },
        ],
      );
      return;
    }
    setIsSigningOut(true);
    await endSession();
    setIsSigningOut(false);
  }

  return { isSigningOut, signOut: () => void signOut() };
}
