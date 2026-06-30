"use client";

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'dw_tutorial_seen';

const TutorialOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const steps = [
    {
      icon: '📺',
      title: 'DoubleWatch',
      desc: 'Tonton 2 tayangan YouTube secara bersamaan — dengan audio yang bisa kamu kendalikan kapan saja.',
    },
    {
      icon: '🎛️',
      title: 'Master Mixer',
      desc: 'Geser slider di bawah layar untuk mencampur audio antar channel. Atau tekan keyboard:',
      keys: ['1 ← Channel Kiri', '2 → Channel Kanan', '3 ↑↓ Mix Tengah'],
    },
    {
      icon: '📺',
      title: 'Ganti Channel',
      desc: 'Arahkan mouse ke bagian atas tengah layar untuk menemukan input URL. Paste link YouTube — video langsung ganti!',
    },
    {
      icon: '💬',
      title: 'Live Chat',
      desc: 'Untuk live stream, klik ikon chat di pojok kanan bawah video. Komentar akan berjalan real-time di bawah layar.',
    },
  ];

  if (!visible) return null;

  const s = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="tutorial-backdrop" onClick={dismiss}>
      <div className="tutorial-card" onClick={e => e.stopPropagation()}>
        <div className="tutorial-step-icon">{s.icon}</div>
        <h2 className="tutorial-title">{s.title}</h2>
        <p className="tutorial-desc">{s.desc}</p>
        {s.keys && (
          <div className="tutorial-keys">
            {s.keys.map(k => (
              <span key={k} className="tutorial-key">{k}</span>
            ))}
          </div>
        )}
        <div className="tutorial-dots">
          {steps.map((_, i) => (
            <span key={i} className={`tutorial-dot ${i === step ? 'active' : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={dismiss}>Lewati</button>
          {isLast ? (
            <button className="tutorial-next primary" onClick={dismiss}>Mulai Menonton 🚀</button>
          ) : (
            <button className="tutorial-next primary" onClick={() => setStep(s => s + 1)}>Lanjut →</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
