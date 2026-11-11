import { Redirect } from 'expo-router';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';

export default function ChangePasswordRoute() {
  const session = useSecuritySession();

  if (!session.isRestoring && !session.user) {
    return <Redirect href="/" />;
  }

  return <ChangePasswordScreen />;
}
