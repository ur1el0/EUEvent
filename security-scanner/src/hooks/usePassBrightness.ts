import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';

const PASS_BRIGHTNESS = 1;

/**
 * Raises this app's screen brightness while `active`, and puts it back when the
 * pass closes or the app leaves the foreground. Only the app window brightness is
 * changed, so no system permission is needed; any failure is ignored.
 */
export function usePassBrightness(active: boolean) {
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;

    let previous: number | null = null;
    let isRaised = false;
    let isOpen = true;
    // Serialize raise/restore so a quick close or app switch cannot interleave them.
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (step: () => Promise<void>) => {
      queue = queue.then(step).catch(() => undefined);
    };

    const raise = async () => {
      if (!isOpen || isRaised || !(await Brightness.isAvailableAsync())) return;
      previous = await Brightness.getBrightnessAsync();
      await Brightness.setBrightnessAsync(PASS_BRIGHTNESS);
      isRaised = true;
    };

    const restore = async () => {
      if (!isRaised) return;
      isRaised = false;
      if (Platform.OS === 'android') {
        await Brightness.restoreSystemBrightnessAsync();
      } else if (previous !== null) {
        await Brightness.setBrightnessAsync(previous);
      }
    };

    enqueue(raise);
    const subscription = AppState.addEventListener('change', (state) => {
      enqueue(state === 'active' ? raise : restore);
    });

    return () => {
      isOpen = false;
      subscription.remove();
      enqueue(restore);
    };
  }, [active]);
}
