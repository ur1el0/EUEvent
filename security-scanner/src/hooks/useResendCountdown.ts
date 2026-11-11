import { useEffect, useState } from 'react';
import { secondsUntil } from '../services/registrationCopy';

/** Whole seconds left until `availableAtMs`, updated every second from the clock so it survives backgrounding. */
export function useResendCountdown(availableAtMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (secondsUntil(availableAtMs, Date.now()) === 0) return undefined;

    // State is only set from the timer callback, never synchronously in the effect.
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (secondsUntil(availableAtMs, current) === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [availableAtMs]);

  return secondsUntil(availableAtMs, now);
}
