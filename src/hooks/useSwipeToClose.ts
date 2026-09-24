import { useEffect, useRef, type RefObject } from 'react';

const DECIDE_PX = 6;          // movement before deciding between "drag sheet" and "scroll/other"
const CLOSE_VELOCITY = 0.6;   // px/ms — a quick flick closes even if short

/**
 * Swipe-down-to-close for bottom sheets on touch screens (like the YouTube app).
 * The sheet follows the finger; releasing far enough or with a flick closes it, otherwise it
 * springs back. Content that is scrolled down scrolls first, and sliders never trigger it.
 */
export function useSwipeToClose(ref: RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let decided = false;
    let dragging = false;
    let scroller: HTMLElement | null = null;

    // Nearest scrollable element between the touch target and the sheet
    const scrollParent = (node: Element | null): HTMLElement | null => {
      for (let n = node as HTMLElement | null; n && n !== sheet; n = n.parentElement) {
        const overflowY = getComputedStyle(n).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    };

    const onStart = (e: TouchEvent) => {
      decided = e.touches.length !== 1 || Boolean((e.target as Element).closest('input[type="range"]'));
      dragging = false;
      if (decided) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = e.timeStamp;
      offset = 0;
      scroller = scrollParent(e.target as Element);
    };

    const onMove = (e: TouchEvent) => {
      if (decided && !dragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return;
        decided = true;
        dragging = dy > 0 && Math.abs(dy) > Math.abs(dx) && (!scroller || scroller.scrollTop <= 0);
        if (!dragging) return;
        sheet.style.transition = 'none';
      }
      e.preventDefault();   // also stops pull-to-refresh
      offset = Math.max(0, dy);
      sheet.style.transform = `translateY(${offset}px)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!dragging) return;
      dragging = false;
      const velocity = offset / Math.max(1, e.timeStamp - startTime);
      const close = offset > Math.min(140, sheet.offsetHeight * 0.3) || velocity > CLOSE_VELOCITY;
      sheet.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
      if (close) {
        sheet.style.transform = `translateY(${sheet.offsetHeight}px)`;
        window.setTimeout(() => closeRef.current(), 180);
      } else {
        sheet.style.transform = '';
        window.setTimeout(() => { sheet.style.transition = ''; }, 220);
      }
    };

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
      sheet.style.transform = '';
      sheet.style.transition = '';
    };
  }, [ref, enabled]);
}
