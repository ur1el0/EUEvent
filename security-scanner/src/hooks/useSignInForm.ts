import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { TextInputInstance } from 'react-native';
import { useSecuritySession } from './useSecuritySession';
import { REGISTRATION_SUCCESS_NOTICE } from '../services/registrationCopy';
import { getSignInErrorCopy, getSignInMissingHint, type SignInErrorCopy } from '../services/signInCopy';

export function useSignInForm() {
  const session = useSecuritySession();
  const [typed, setTyped] = useState<{ value: string; basis: string | undefined } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<SignInErrorCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  // After registering, the verify screen returns here with the student number to fill in.
  const { registered, identifier: registeredIdentifier } = useLocalSearchParams<{ registered?: string; identifier?: string }>();

  // Derived instead of copied into state: the student number from registration fills the field until the
  // person types, and the success notice shows until they submit.
  const noticeKey = registered === '1' ? (registeredIdentifier ?? 'registered') : null;
  const identifier = typed !== null && typed.basis === registeredIdentifier ? typed.value : (registeredIdentifier ?? '');
  const notice = noticeKey !== null && dismissedNoticeKey !== noticeKey ? REGISTRATION_SUCCESS_NOTICE : '';
  const setIdentifier = (value: string) => setTyped({ value, basis: registeredIdentifier });

  const setPasswordInput = useCallback((input: TextInputInstance | null) => {
    passwordRef.current = input;
  }, []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const missingHint = getSignInMissingHint(identifier, password);

  async function submit() {
    if (missingHint || isSubmitting) return;

    setError(null);
    setDismissedNoticeKey(noticeKey);
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
    notice,
    serverUrl: session.serverUrl,
  };
}
