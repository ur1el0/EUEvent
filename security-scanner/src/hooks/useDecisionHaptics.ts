import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import type { ScanDecision } from '../services/scanDecision';
import { getDecisionHaptic } from '../services/scanFeedback';

/** Success buzz for ADMIT, error buzz for DO NOT ADMIT. No sound is played. */
export function useDecisionHaptics(decision: ScanDecision | null) {
  const previousRef = useRef<ScanDecision | null>(null);

  useEffect(() => {
    const haptic = getDecisionHaptic(previousRef.current, decision);
    previousRef.current = decision;
    if (!haptic) return;

    void Haptics.notificationAsync(
      haptic === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => undefined);
  }, [decision]);
}
