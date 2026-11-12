import { Redirect } from 'expo-router';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { canOpenProfile } from '../services/profileDetails';
import { ProfileScreen } from '../screens/ProfileScreen';

/** Signed-out visitors, and any role that does not use the mobile app, are sent back to the start screen. */
export default function ProfileRoute() {
  const session = useSecuritySession();

  if (!session.isRestoring && !(session.user && canOpenProfile(session.user.role))) {
    return <Redirect href="/" />;
  }

  return <ProfileScreen />;
}
