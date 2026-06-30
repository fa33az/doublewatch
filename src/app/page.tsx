"use client";

import { useState, useEffect, useRef } from 'react';
import YouTubePlayer from '../components/YouTubePlayer';
import TutorialOverlay from '../components/TutorialOverlay';
import SplashScreen from '../components/SplashScreen';
import EmptyChannel from '../components/EmptyChannel';
import SettingsPanel, { loadSettings, saveSettings, type AppSettings, DEFAULT_SETTINGS } from '../components/SettingsPanel';
import YouTubeSearch from '../components/YouTubeSearch';
import { Settings, Search } from 'lucide-react';


const MAX_CHANNELS = 4;

const extractVideoId = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

const loadChannels = () => {
  if (typeof window === 'undefined') {
    return Array.from({ length: MAX_CHANNELS }, () => ({ url: '', id: '' }));
  }
  return Array.from({ length: MAX_CHANNELS }, (_, i) => ({
    url: localStorage.getItem(`v${i + 1}url`) || '',
    id:  localStorage.getItem(`v${i + 1}id`)  || '',
  }));
};

function App() {
  const [showSplash,    setShowSplash]    = useState(true);
  const [showSettings,  setShowSettings]  = useState(false);
  const [showSearch,    setShowSearch]    = useState(false);
  const [settings,      setSettings]      = useState<AppSettings>(DEFAULT_SETTINGS);
  const [channels,      setChannels]      = useState(() => Array.from({ length: MAX_CHANNELS }, () => ({ url: '', id: '' })));

  useEffect(() => {
    setSettings(loadSettings());
    setChannels(loadChannels());
  }, []);

  // Audio: crossfader (-100..100) for 2ch, active index for 3-4ch
  const [audioMix,      setAudioMix]      = useState(-100);  // 2-ch crossfader
  const [activeChannel, setActiveChannel] = useState(0);      // 3-4ch selected channel

  const mixRef = useRef(audioMix);
  const fadeIntervalRef = useRef<number | null>(null);

  useEffect(() => { mixRef.current = audioMix; }, [audioMix]);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  /* ── Fade helper ── */
  const fadeTo = (target: number) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const startMix = mixRef.current;
    if (startMix === target) return;
    const durationMs = settings.crossfaderSpeed;
    const startTime  = performance.now();
    const ease       = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    fadeIntervalRef.current = window.setInterval(() => {
      const progress = Math.min((performance.now() - startTime) / durationMs, 1);
      setAudioMix(startMix + (target - startMix) * ease(progress));
      if (progress >= 1) { setAudioMix(target); clearInterval(fadeIntervalRef.current!); }
    }, 16);
  };

  /* ── Keyboard shortcuts (2ch crossfader only) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (settings.channelCount !== 2) return;
      if      (e.key === '1' || e.key === 'ArrowLeft')                            { e.preventDefault(); fadeTo(-100); }
      else if (e.key === '2' || e.key === 'ArrowRight')                            { e.preventDefault(); fadeTo(100); }
      else if (e.key === '3' || e.key === 'ArrowUp' || e.key === 'ArrowDown')      { e.preventDefault(); fadeTo(0); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.channelCount, settings.crossfaderSpeed]);

  /* ── Channel update ── */
  const updateChannel = (idx: number, val: string) => {
    const id = extractVideoId(val);
    setChannels(prev => {
      const next = [...prev];
      next[idx] = { url: val, id };
      return next;
    });
    localStorage.setItem(`v${idx + 1}url`, val);
    localStorage.setItem(`v${idx + 1}id`,  id);
  };

  const clearAllUrls = () => {
    Array.from({ length: MAX_CHANNELS }, (_, i) => {
      localStorage.removeItem(`v${i+1}url`);
      localStorage.removeItem(`v${i+1}id`);
    });
    setChannels(Array.from({ length: MAX_CHANNELS }, () => ({ url: '', id: '' })));
  };

  /* ── Volume logic ── */
  const getVolume = (idx: number): number => {
    const n = settings.channelCount;
    if (n === 2) {
      if (idx === 0) return audioMix <= 0 ? 100 : 100 - audioMix;
      if (idx === 1) return audioMix >= 0 ? 100 : 100 + audioMix;
    }
    // 3-4ch: active channel = 100, others = 0
    return idx === activeChannel ? 100 : 0;
  };

  const n = settings.channelCount;

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={handleSettingsChange}
        onClearUrls={clearAllUrls}
        channels={channels}
        onChannelChange={updateChannel}
      />

      {showSearch && (
        <YouTubeSearch
          channelCount={n}
          onSelect={(channelIdx, videoId) => {
            updateChannel(channelIdx, `https://www.youtube.com/watch?v=${videoId}`);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="app-container">
        <TutorialOverlay />

        <main className={`split-view layout-${n}`}>
          {Array.from({ length: n }).map((_, idx) => (
            <div key={idx} className="pane">
              {channels[idx]?.id
                ? <YouTubePlayer
                    videoId={channels[idx].id}
                    targetVolume={getVolume(idx)}
                    isFocused={idx === activeChannel || n === 2}
                    settings={settings}
                  />
                : <EmptyChannel channel={idx + 1} onUrlSubmit={url => updateChannel(idx, url)} />
              }
            </div>
          ))}
        </main>

        {/* ── Master Mixer ── */}
        <div className="master-mixer">
          {/* Global Search Button */}
          <button className="mixer-search-btn" onClick={() => setShowSearch(true)} title="Cari Live Streaming">
            <Search size={16} />
            <span className="search-btn-text">Cari Live</span>
          </button>

          <div className="mixer-divider" />

          <div className="mixer-center-area">
            {n === 2 ? (
              <div className="mixer-crossfader-group">
                <div className={`mixer-label ${audioMix < 0 ? 'active' : ''}`}>CH 1</div>
                <div className="crossfader-wrapper">
                  <div className="crossfader-notch" />
                  <input
                    type="range" className="dj-crossfader"
                    min="-100" max="100" value={audioMix}
                    onChange={e => {
                      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                      setAudioMix(Number(e.target.value));
                    }}
                  />
                </div>
                <div className={`mixer-label ${audioMix > 0 ? 'active' : ''}`}>CH 2</div>
              </div>
            ) : (
              <div className="ch-selector">
                {Array.from({ length: n }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`ch-sel-btn ${activeChannel === idx ? 'active' : ''}`}
                    onClick={() => setActiveChannel(idx)}
                  >
                    CH {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mixer-divider" />

          <button className="mixer-settings-btn" onClick={() => setShowSettings(true)} title="Pengaturan">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
