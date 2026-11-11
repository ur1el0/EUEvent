import { useCallback, useState } from 'react';

/** The error and success notices shown at the top of a workspace. */
export function useFlashMessages() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const clear = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  return { error, notice, setError, setNotice, clear };
}

export type FlashMessages = ReturnType<typeof useFlashMessages>;
