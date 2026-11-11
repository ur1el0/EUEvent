import { useCallback, useRef } from 'react';
import type { TextInputInstance } from 'react-native';

/**
 * Lets a form move focus to the next field when the keyboard's "next" key is pressed.
 * `register(field)` is passed as the field's ref, and `focusNext(field)` as its onSubmitEditing.
 */
export function useFocusChain<Field extends string>(order: readonly Field[]) {
  const inputs = useRef(new Map<Field, TextInputInstance>());
  const callbacks = useRef(new Map<Field, (input: TextInputInstance | null) => void>());

  const register = useCallback((field: Field) => {
    let callback = callbacks.current.get(field);

    if (!callback) {
      callback = (input) => {
        if (input) inputs.current.set(field, input);
        else inputs.current.delete(field);
      };
      callbacks.current.set(field, callback);
    }

    return callback;
  }, []);

  const focusNext = useCallback((field: Field) => () => {
    const next = order[order.indexOf(field) + 1];
    if (next) inputs.current.get(next)?.focus();
  }, [order]);

  return { register, focusNext };
}
