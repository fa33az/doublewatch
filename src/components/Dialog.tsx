"use client";

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface DialogProps {
  label: string;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Accessible dialog (a bottom sheet on phones). Rendered into <body> so nested dialogs
 * stack correctly; backdrop click and Esc close it, Tab focus stays inside.
 */
const Dialog: React.FC<DialogProps> = ({ label, onClose, size = 'md', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`dialog is-${size}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export const DialogHeader: React.FC<{ title: string; onClose: () => void; children?: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="dialog-header">
    <h2 className="dialog-title">{title}</h2>
    {children}
    <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
  </div>
);

export default Dialog;
