import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

// Nested dialogs (e.g. a confirm inside Settings): only the top-most trap handles keys
const trapStack: symbol[] = [];

/**
 * Keeps Tab focus inside `ref` while `active`, calls `onEscape` on Esc, and restores the
 * previously focused element on close. Focuses `[data-autofocus]` first if present.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; });

  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;

    const id = Symbol('focus-trap');
    trapStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0);

    if (!container.contains(document.activeElement)) {
      const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
      (preferred ?? focusables()[0] ?? container).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== id) return;
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      trapStack.splice(trapStack.indexOf(id), 1);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, ref]);
}
