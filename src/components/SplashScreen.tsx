"use client";

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2200);
    const doneTimer = setTimeout(() => onDone(), 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`splash-backdrop ${fading ? 'fade-out' : ''}`} onClick={() => { setFading(true); setTimeout(onDone, 400); }}>
      <div className="tv-scene">
        <div className="tv-wrapper">
          {/* Antenna */}
          <div className="tv-antenna">
            <div className="antenna-left" />
            <div className="antenna-right" />
          </div>

          {/* TV Body */}
          <div className="tv-body">
            {/* Screen */}
            <div className="tv-screen-bezel">
              <div className="tv-screen">
                <div className="tv-noise" />
                <div className="tv-scanlines" />
                <div className="tv-glitch-bar" />
                <div className="tv-no-signal">
                  <span className="ns-icon">◈</span>
                  <span className="ns-text">NO SIGNAL</span>
                  <span className="ns-sub">DOUBLEWATCH</span>
                </div>
                <div className="tv-screen-glare" />
              </div>
            </div>

            {/* Bottom panel with knobs */}
            <div className="tv-bottom-panel">
              <div className="tv-knob" />
              <div className="tv-knob" />
              <div className="tv-brand">DW</div>
              <div className="tv-vent">
                {[...Array(5)].map((_, i) => <div key={i} className="vent-line" />)}
              </div>
            </div>
          </div>

          {/* TV Stand */}
          <div className="tv-stand">
            <div className="stand-neck" />
            <div className="stand-base" />
          </div>
        </div>

        <p className="splash-hint">Klik mana saja untuk lanjut</p>
      </div>
    </div>
  );
};

export default SplashScreen;
