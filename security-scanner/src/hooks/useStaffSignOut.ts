import { useState } from 'react';
import { Alert } from 'react-native';

/** Signs staff out, warning first when scans are still waiting on this phone. */
export function useStaffSignOut(staffId: number | undefined, pendingScansCount: number, endSession: () => Promise<void>) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (staffId && pendingScansCount > 0) {
      Alert.alert(
        'Scans not sent yet',
        `${pendingScansCount} checked ${pendingScansCount === 1 ? 'scan is' : 'scans are'} still saved on this phone. Signing out keeps them here so this staff account can send them to the server later.`,
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
