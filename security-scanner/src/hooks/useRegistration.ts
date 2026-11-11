import { useState } from 'react';
import { router } from 'expo-router';
import { useSecuritySession } from './useSecuritySession';
import { registerStudent } from '../services/registration';
import { getRegistrationErrorCopy, type RegistrationErrorCopy } from '../services/registrationCopy';
import {
  normalizeEmail,
  normalizeStudentNumber,
  validateRegistration,
  type RegistrationField,
  type RegistrationValues,
} from '../services/registrationValidation';

const EMPTY: RegistrationValues = { studentNumber: '', name: '', email: '', password: '', confirmation: '' };

/** The create-account form: values, inline errors, and the first step of registration. */
export function useRegistration() {
  const { serverUrl } = useSecuritySession();
  const [values, setValues] = useState<RegistrationValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<RegistrationErrorCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errors = validateRegistration(values);

  async function submit(): Promise<void> {
    if (isSubmitting) return;

    setHasSubmitted(true);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await registerStudent(values, serverUrl);
      const email = normalizeEmail(values.email);
      const studentNumber = normalizeStudentNumber(values.studentNumber);
      // The password is only needed for this request. It is cleared here and never passed to the next screen.
      setValues((current) => ({ ...current, password: '', confirmation: '' }));
      router.push({ pathname: '/verify-registration', params: { email, studentNumber } });
    } catch (cause) {
      setError(getRegistrationErrorCopy(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    values,
    setField: (field: RegistrationField, value: string) => setValues((current) => ({ ...current, [field]: value })),
    markTouched: (field: RegistrationField) => setTouched((current) => ({ ...current, [field]: true })),
    /** An error is shown once the field was left or the form was submitted. */
    errorFor: (field: RegistrationField): string | undefined => (hasSubmitted || touched[field] ? errors[field] : undefined),
    error,
    isSubmitting,
    submit: () => void submit(),
    serverUrl,
  };
}
