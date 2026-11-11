import { Redirect } from 'expo-router';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { ProfileScreen } from '../screens/ProfileScreen';

export default function ProfileRoute() {
  const session = useSecuritySession();

  if (!session.isRestoring && !session.user) {
    return <Redirect href="/" />;
  }

  return <ProfileScreen />;
}
