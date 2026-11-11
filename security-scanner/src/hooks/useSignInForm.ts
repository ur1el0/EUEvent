import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { useSecuritySession } from './useSecuritySession';
import { sessionStorage } from '../services/sessionStorage';
import {
  getSignInErrorCopy,
  getSignInMissingHint,
  identifierFitsAccountType,
  type SignInAccountType,
  type SignInErrorCopy,
} from '../services/signInCopy';

export function useSignInForm() {
  const session = useSecuritySession();
  const [accountType, setAccountType] = useState<SignInAccountType>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<SignInErrorCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasChosenTypeRef = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const applyAccountType = useCallback((nextType: SignInAccountType) => {
    setAccountType(nextType);
    // Keep the typed identifier when it still suits the new tab (email for staff, number for students).
    setIdentifier((current) => (identifierFitsAccountType(current, nextType) ? current : ''));
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    sessionStorage.readLastAccountType()
      .then((saved) => {
        if (active && saved && !hasChosenTypeRef.current) applyAccountType(saved);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [applyAccountType]);

  const selectAccountType = useCallback((nextType: SignInAccountType) => {
    hasChosenTypeRef.current = true;
    applyAccountType(nextType);
    void sessionStorage.saveLastAccountType(nextType).catch(() => undefined);
  }, [applyAccountType]);

  const setPasswordInput = useCallback((input: TextInputInstance | null) => {
    passwordRef.current = input;
  }, []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const missingHint = getSignInMissingHint(accountType, identifier, password);

  async function submit() {
    if (missingHint || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await session.signIn(identifier, password, accountType);
    } catch (cause) {
      setError(getSignInErrorCopy(cause, accountType));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    accountType,
    isStudent: accountType === 'student',
    selectAccountType,
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
