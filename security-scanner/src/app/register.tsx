import { Redirect } from 'expo-router';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { RegisterScreen } from '../screens/RegisterScreen';

export default function RegisterRoute() {
  const session = useSecuritySession();

  // Someone who is already signed in has no use for the create-account form.
  if (!session.isRestoring && session.user) {
    return <Redirect href="/" />;
  }

  return <RegisterScreen />;
}
