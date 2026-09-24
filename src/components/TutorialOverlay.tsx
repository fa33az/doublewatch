"use client";

import React, { useState, useEffect } from 'react';
import { MonitorPlay, SlidersHorizontal, MousePointerClick, Library, MessagesSquare, Keyboard } from 'lucide-react';
import Dialog from './Dialog';

export const TUTORIAL_KEY = 'dw_tutorial_seen';

const STEPS: { icon: React.ReactNode; title: string; desc: string; keys?: [string, string][] }[] = [
  {
    icon: <MonitorPlay size={22} />,
    title: 'Selamat datang di DoubleWatch',
    desc: 'Tonton 2 sampai 4 siaran YouTube live sekaligus, dan atur audio masing-masing kapan saja.',
  },
  {
    icon: <SlidersHorizontal size={22} />,
    title: 'Atur audio',
    desc: '2 layar: geser crossfader di bar bawah. 3–4 layar: pilih channel yang ingin didengar, atau MIX untuk semua. Tombol Mixer mengatur volume per channel.',
    keys: [['1–4', 'Pilih channel'], ['0', 'Mix'], ['M', 'Mute']],
  },
  {
    icon: <MousePointerClick size={22} />,
    title: 'Kontrol tiap layar',
    desc: 'Arahkan kursor atau ketuk layar untuk melihat judul siaran, lalu ganti, tukar posisi, atau kosongkan layar itu.',
  },
  {
    icon: <Library size={22} />,
    title: 'Library',
    desc: 'Simpan kombinasi channel sebagai preset, buka lagi riwayat tontonan, dan ikuti channel favorit untuk tahu kapan mereka live.',
  },
  {
    icon: <MessagesSquare size={22} />,
    title: 'Live chat',
    desc: 'Nyalakan chat di samping tiap layar, atau buka Chat gabungan untuk membaca semua channel sekaligus.',
  },
  {
    icon: <Keyboard size={22} />,
    title: 'Shortcut',
    desc: 'Tekan ? kapan saja untuk melihat semua shortcut.',
    keys: [['Spasi', 'Jeda'], ['F', 'Teater'], ['S', 'Cari']],
  },
];

const TutorialOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog label="Tutorial DoubleWatch" onClose={dismiss} size="sm">
      <div className="tour">
        <div className="tour-icon" aria-hidden="true">{s.icon}</div>
        <p className="tour-step">{step + 1} / {STEPS.length}</p>
        <h2 className="tour-title">{s.title}</h2>
        <p className="tour-desc">{s.desc}</p>
        {s.keys && (
          <div className="tour-keys">
            {s.keys.map(([k, label]) => <span key={k}><kbd className="kbd">{k}</kbd>{label}</span>)}
          </div>
        )}
        <div className="tour-dots" role="tablist" aria-label="Langkah tutorial">
          {STEPS.map((_, i) => (
            <button key={i} role="tab" aria-selected={i === step} aria-label={`Langkah ${i + 1}`} className="tour-dot" onClick={() => setStep(i)} />
          ))}
        </div>
        <div className="tour-actions">
          <button className="btn btn-ghost" onClick={dismiss}>Lewati</button>
          {isLast
            ? <button className="btn btn-primary" onClick={dismiss} data-autofocus>Mulai menonton</button>
            : <button className="btn btn-primary" onClick={() => setStep(i => i + 1)} data-autofocus>Lanjut</button>}
        </div>
      </div>
    </Dialog>
  );
};

export default TutorialOverlay;
