"use client";

import React, { useRef, type RefObject } from 'react';

interface SplitDividerProps {
  ratio: number;
  orientation: 'vertical' | 'horizontal';
  containerRef: RefObject<HTMLElement | null>;
  onDrag: (ratio: number) => void;     // live, while dragging
  onCommit: (ratio: number) => void;   // on release; persists
}

const MIN = 0.2;
const MAX = 0.8;
const STEP = 0.05;
const clamp = (r: number) => Math.min(MAX, Math.max(MIN, r));

/** Draggable handle between the two screens. Double-click resets to 50/50. */
const SplitDivider: React.FC<SplitDividerProps> = ({ ratio, orientation, containerRef, onDrag, onCommit }) => {
  const draggingRef = useRef(false);
  const latestRef = useRef(ratio);
  const vertical = orientation === 'vertical';

  const ratioFromPointer = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return ratio;
    return clamp(vertical ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    document.body.classList.add('is-resizing');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    latestRef.current = ratioFromPointer(e);
    onDrag(latestRef.current);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.classList.remove('is-resizing');
    onCommit(latestRef.current);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dec = vertical ? 'ArrowLeft' : 'ArrowUp';
    const inc = vertical ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== dec && e.key !== inc && e.key !== 'Home') return;
    // Keep these keys from also moving the crossfader
    e.preventDefault();
    e.stopPropagation();
    onCommit(e.key === 'Home' ? 0.5 : clamp(ratio + (e.key === inc ? STEP : -STEP)));
  };

  return (
    <div
      className={`divider is-${orientation}`}
      style={vertical ? { left: `${ratio * 100}%` } : { top: `${ratio * 100}%` }}
      role="separator"
      aria-orientation={orientation}
      aria-label="Ubah ukuran layar"
      aria-valuemin={MIN * 100}
      aria-valuemax={MAX * 100}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      title="Geser untuk mengubah ukuran · klik dua kali untuk 50/50"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onCommit(0.5)}
      onKeyDown={onKeyDown}
    >
      <span className="divider-grip" />
    </div>
  );
};

export default SplitDivider;
