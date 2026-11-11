import { useState } from 'react';
import { router } from 'expo-router';
import { useResendCountdown } from './useResendCountdown';
import { useSecuritySession } from './useSecuritySession';
import { resendRegistrationCode, verifyRegistration } from '../services/registration';
import { RESEND_COOLDOWN_SECONDS } from '../services/registrationConstants';
import { getVerifyErrorCopy, type RegistrationErrorCopy } from '../services/registrationCopy';
import { isVerificationCodeComplete, sanitizeVerificationCode } from '../services/registrationValidation';

/** Checks the emailed code and lets the student ask for a new one once the cooldown has passed. */
export function useVerifyRegistration(email: string, studentNumber: string) {
  const { serverUrl } = useSecuritySession();
  const [code, setCodeValue] = useState('');
  const [error, setError] = useState<RegistrationErrorCopy | null>(null);
  const [notice, setNotice] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // A code was just sent by the registration step, so the cooldown starts now.
  const [resendAvailableAt, setResendAvailableAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  const secondsLeft = useResendCountdown(resendAvailableAt);
  const isComplete = isVerificationCodeComplete(code);

  async function verify(): Promise<void> {
    if (!isComplete || isVerifying) return;

    setError(null);
    setNotice('');
    setIsVerifying(true);
    try {
      await verifyRegistration(email, sanitizeVerificationCode(code), serverUrl);
      // Back to the sign-in screen with the student number filled in: students sign in with it, not with email.
      router.dismissTo({ pathname: '/', params: { registered: '1', identifier: studentNumber } });
    } catch (cause) {
      setError(getVerifyErrorCopy(cause));
    } finally {
      setIsVerifying(false);
    }
  }

  async function resend(): Promise<void> {
    if (secondsLeft > 0 || isResending) return;

    setError(null);
    setNotice('');
    setIsResending(true);
    try {
      const response = await resendRegistrationCode(email, serverUrl);
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setCodeValue('');
      setNotice(response.message);
    } catch (cause) {
      setError(getVerifyErrorCopy(cause));
    } finally {
      setIsResending(false);
    }
  }

  return {
    code,
    setCode: (value: string) => setCodeValue(sanitizeVerificationCode(value)),
    isComplete,
    error,
    notice,
    isVerifying,
    isResending,
    secondsLeft,
    verify: () => void verify(),
    resend: () => void resend(),
  };
}
