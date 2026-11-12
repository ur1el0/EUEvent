import { useCallback, useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { useSecuritySession } from './useSecuritySession';
import { getSignInErrorCopy, getSignInMissingHint, type SignInErrorCopy } from '../services/signInCopy';

export function useSignInForm() {
  const session = useSecuritySession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<SignInErrorCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const setPasswordInput = useCallback((input: TextInputInstance | null) => {
    passwordRef.current = input;
  }, []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const missingHint = getSignInMissingHint(identifier, password);

  async function submit() {
    if (missingHint || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      // The server's user.role decides which home screen opens; there is no role to pick.
      await session.signIn(identifier, password);
    } catch (cause) {
      setError(getSignInErrorCopy(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    setPasswordInput,
    focusPassword,
    submit: () => void submit(),
    isSubmitting,
    missingHint,
    error,
    serverUrl: session.serverUrl,
  };
}
