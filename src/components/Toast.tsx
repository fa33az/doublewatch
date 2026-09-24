"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ShowToast = (message: string, durationMs?: number) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((msg, durationMs = 2200) => {
    setMessage(msg);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(null), durationMs);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && <div className="toast" role="status" aria-live="polite">{message}</div>}
    </ToastContext.Provider>
  );
};
