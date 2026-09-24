import { useLayoutEffect, useRef } from 'react';

/** Keeps a chat list scrolled to the newest message unless the user scrolled up to read. */
export function useStickToBottom<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const stickRef = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [dep]);

  const onScroll = () => {
    const el = ref.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return [ref, onScroll] as const;
}
