import { useCallback, useEffect, useRef, useState } from 'react';

/** `visible` turns true on every `poke()` and falls back to false after `delayMs` of inactivity. */
export function useAutoHide(delayMs = 3000) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const poke = useCallback(() => {
    setVisible(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { visible, poke, hide };
}
