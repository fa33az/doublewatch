"use client";

import React, { useState, useEffect } from 'react';
import { X, Sliders, MessageSquare, Keyboard, Trash2, RefreshCw, Info, Tv } from 'lucide-react';

export interface AppSettings {
  crossfaderSpeed: number;
  chatDuration: number;
  showMemberBadge: boolean;
  showModBadge: boolean;
  autoLiveSync: boolean;
  danmakuMinGap: number;
  channelCount: 2 | 3 | 4;
}

export const DEFAULT_SETTINGS: AppSettings = {
  crossfaderSpeed: 800,
  chatDuration: 12,
  showMemberBadge: true,
  showModBadge: true,
  autoLiveSync: true,
  danmakuMinGap: 2.5,
  channelCount: 2,
};

const STORAGE_KEY = 'dw_settings';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Subcomponents ──────────────────────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button className={`stg-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
    <span className="stg-toggle-knob" />
  </button>
);

const SliderRow: React.FC<{
  label: string; sub?: string;
  min: number; max: number; step: number;
  value: number; unit: string;
  onChange: (v: number) => void;
}> = ({ label, sub, min, max, step, value, unit, onChange }) => (
  <div className="stg-row">
    <div className="stg-row-info">
      <span className="stg-row-label">{label}</span>
      {sub && <span className="stg-row-sub">{sub}</span>}
    </div>
    <div className="stg-slider-group">
      <input type="range" className="stg-slider" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <span className="stg-val">{value}{unit}</span>
    </div>
  </div>
);

const ToggleRow: React.FC<{
  label: string; sub?: string;
  value: boolean; onChange: (v: boolean) => void;
}> = ({ label, sub, value, onChange }) => (
  <div className="stg-row">
    <div className="stg-row-info">
      <span className="stg-row-label">{label}</span>
      {sub && <span className="stg-row-sub">{sub}</span>}
    </div>
    <Toggle value={value} onChange={onChange} />
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClearUrls: () => void;
  channels: { url: string; id: string }[];
  onChannelChange: (idx: number, url: string) => void;
}

const TABS = [
  { id: 'channels', icon: <Tv size={14} />, label: 'Channel' },
  { id: 'playback', icon: <Sliders size={14} />, label: 'Playback' },
  { id: 'chat',     icon: <MessageSquare size={14} />, label: 'Chat' },
  { id: 'keys',     icon: <Keyboard size={14} />, label: 'Keys' },
  { id: 'about',    icon: <Info size={14} />, label: 'Tentang' },
];

const SHORTCUTS = [
  { keys: ['1', '←'], desc: 'Audio penuh ke Channel 1' },
  { keys: ['2', '→'], desc: 'Audio penuh ke Channel 2' },
  { keys: ['3', '↑', '↓'], desc: 'Mix 50/50 kedua channel' },
];

const LAYOUT_OPTIONS: { count: 2 | 3 | 4; label: string; icon: string }[] = [
  { count: 2, label: '2 Layar', icon: '⬛⬛' },
  { count: 3, label: '3 Layar', icon: '⬛⬛⬛' },
  { count: 4, label: '4 Layar', icon: '⬛⬛\n⬛⬛' },
];

const SettingsPanel: React.FC<Props> = ({ open, onClose, settings, onChange, onClearUrls, channels, onChannelChange }) => {
  const [tab, setTab] = useState('channels');
  const set = (partial: Partial<AppSettings>) => onChange({ ...settings, ...partial });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const activeCount = settings.channelCount;

  return (
    <div className="stg-backdrop" onClick={onClose}>
      <div className="stg-panel" onClick={e => e.stopPropagation()}>

          <div className="stg-header">
            <h2 className="stg-title">Pengaturan</h2>
            <button className="stg-close" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="stg-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`stg-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="stg-body">

            {/* ── CHANNELS ── */}
            {tab === 'channels' && (
              <div className="stg-section">

                {/* Layout picker */}
                <div>
                  <p className="stg-row-label" style={{ marginBottom: '0.75rem' }}>Layout Layar</p>
                  <div className="layout-picker">
                    {LAYOUT_OPTIONS.map(o => (
                      <button
                        key={o.count}
                        className={`layout-option ${activeCount === o.count ? 'active' : ''}`}
                        onClick={() => set({ channelCount: o.count })}
                      >
                        <span className="layout-grid" data-count={o.count}>
                          {Array.from({ length: o.count }).map((_, i) => <span key={i} className="layout-cell" />)}
                        </span>
                        <span className="layout-label">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel URL inputs */}
                <div className="stg-channels-list">
                  {Array.from({ length: activeCount }).map((_, idx) => (
                    <div key={idx} className="stg-channel-row">
                      <span className="stg-ch-label">CH {idx + 1}</span>
                      <input
                        type="text"
                        className="stg-ch-input"
                        placeholder="YouTube URL atau ID..."
                        value={channels[idx]?.url || ''}
                        onChange={e => onChannelChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* API Key section removed — search uses backend */}
              </div>
            )}

            {/* ── PLAYBACK ── */}
            {tab === 'playback' && (
              <div className="stg-section">
                <SliderRow
                  label="Kecepatan Crossfader"
                  sub="Durasi animasi fade antar channel"
                  min={200} max={2000} step={100}
                  value={settings.crossfaderSpeed} unit="ms"
                  onChange={v => set({ crossfaderSpeed: v })}
                />
                <ToggleRow
                  label="Auto Sync ke Live Edge"
                  sub="Langsung seekTo live saat video dimuat"
                  value={settings.autoLiveSync}
                  onChange={v => set({ autoLiveSync: v })}
                />
              </div>
            )}

            {/* ── CHAT ── */}
            {tab === 'chat' && (
              <div className="stg-section">
                <SliderRow
                  label="Kecepatan Pesan"
                  sub="Berapa detik pesan bergerak melintasi layar"
                  min={6} max={20} step={1}
                  value={settings.chatDuration} unit="s"
                  onChange={v => set({ chatDuration: v })}
                />
                <SliderRow
                  label="Jarak Antar Pesan"
                  sub="Minimal detik sebelum pesan berikutnya muncul"
                  min={1} max={6} step={0.5}
                  value={settings.danmakuMinGap} unit="s"
                  onChange={v => set({ danmakuMinGap: v })}
                />
                <ToggleRow
                  label="Badge Member"
                  sub="Tampilkan label hijau untuk member"
                  value={settings.showMemberBadge}
                  onChange={v => set({ showMemberBadge: v })}
                />
                <ToggleRow
                  label="Badge Moderator"
                  sub="Tampilkan label biru untuk moderator"
                  value={settings.showModBadge}
                  onChange={v => set({ showModBadge: v })}
                />
              </div>
            )}

            {/* ── SHORTCUTS ── */}
            {tab === 'keys' && (
              <div className="stg-section">
                <p className="stg-desc">Shortcut keyboard bekerja saat fokus bukan di kolom input.</p>
                <div className="stg-shortcuts">
                  {SHORTCUTS.map((s, i) => (
                    <div key={i} className="stg-shortcut-row">
                      <div className="stg-key-group">
                        {s.keys.map(k => <kbd key={k} className="stg-kbd">{k}</kbd>)}
                      </div>
                      <span className="stg-shortcut-desc">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ABOUT ── */}
            {tab === 'about' && (
              <div className="stg-section">
                <div className="stg-about-logo">DW</div>
                <p className="stg-about-name">DoubleWatch</p>
                <p className="stg-about-sub">Tonton YouTube live secara bersamaan dengan kontrol audio penuh.</p>

                <div className="stg-danger-zone">
                  <p className="stg-danger-title">Zona Berbahaya</p>
                  <button className="stg-danger-btn" onClick={() => {
                    localStorage.removeItem('dw_tutorial_seen');
                    alert('Tutorial akan muncul lagi saat halaman dibuka kembali.');
                  }}>
                    <RefreshCw size={14} /> Reset Tutorial
                  </button>
                  <button className="stg-danger-btn red" onClick={() => {
                    if (confirm('Hapus semua URL yang tersimpan?')) { onClearUrls(); onClose(); }
                  }}>
                    <Trash2 size={14} /> Hapus URL Tersimpan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default SettingsPanel;
