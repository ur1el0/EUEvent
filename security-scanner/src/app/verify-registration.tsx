import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { VerifyRegistrationScreen } from '../screens/VerifyRegistrationScreen';

export default function VerifyRegistrationRoute() {
  const session = useSecuritySession();
  const { email, studentNumber } = useLocalSearchParams<{ email?: string; studentNumber?: string }>();

  if (!session.isRestoring && session.user) {
    return <Redirect href="/" />;
  }

  // Opened without a registration in progress (for example from a stale link): start again.
  if (!email) {
    return <Redirect href="/register" />;
  }

  return <VerifyRegistrationScreen email={email} studentNumber={studentNumber ?? ''} />;
}
