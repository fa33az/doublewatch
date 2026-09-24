"use client";

import React from 'react';
import { Settings, Search, Link2, Library, SlidersHorizontal, MessagesSquare, Expand, Minimize, Volume2 } from 'lucide-react';
import { MIX_ALL } from '../lib/mixer';
import { CHANNEL_COLORS } from '../lib/chat';

interface ControlBarProps {
  n: number;
  audioMix: number;
  onCrossfader: (value: number) => void;
  solo: number;
  onSolo: (slot: number) => void;
  swipeAudioSlot: number | null;   // mobile swipe with "audio follows screen"
  onSelectScreen: (slot: number) => void;
  masterMuted: boolean;
  liveFollows: number;             // followed channels currently live (badge on Library)
  mixerOpen: boolean;
  combinedChatOpen: boolean;
  theater: boolean;
  onOpenSearch: () => void;
  onOpenLibrary: () => void;
  onToggleMixer: () => void;
  onToggleCombinedChat: () => void;
  onToggleTheater: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
}

interface DockButtonProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  tip: string;
  onClick: () => void;
  primary?: boolean;
  warn?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  badge?: number;
}

// Icon + tooltip on desktop (label stays for screen readers); icon + label tab on phones
const DockButton: React.FC<DockButtonProps> = ({ icon, label, tip, onClick, primary, warn, pressed, expanded, badge }) => (
  <button
    className={`dock-btn ${primary ? 'is-primary' : ''} ${warn ? 'is-warn' : ''}`}
    onClick={onClick}
    data-tip={tip}
    aria-pressed={pressed}
    aria-expanded={expanded}
  >
    <span className="dock-icon">
      {icon}
      {badge ? <span className="badge-count" aria-label={`${badge} channel diikuti sedang live`}>{badge}</span> : null}
    </span>
    <span className="dock-label">{label}</span>
  </button>
);

const ControlBar: React.FC<ControlBarProps> = ({
  n, audioMix, onCrossfader, solo, onSolo, swipeAudioSlot, onSelectScreen, masterMuted, liveFollows,
  mixerOpen, combinedChatOpen, theater,
  onOpenSearch, onOpenLibrary, onToggleMixer, onToggleCombinedChat, onToggleTheater, onShare, onOpenSettings,
}) => {
  const slots = Array.from({ length: n }, (_, i) => i);
  const ch = (i: number) => ({ ['--ch' as string]: CHANNEL_COLORS[i] });

  const audio = swipeAudioSlot !== null ? (
    // Phone swipe mode: the visible screen is the audible one; buttons jump between screens
    <div className="follow-note">
      <div className="segmented is-mono" role="tablist" aria-label="Pilih layar">
        {slots.map(i => (
          <button key={i} role="tab" aria-selected={swipeAudioSlot === i} onClick={() => onSelectScreen(i)} style={ch(i)}>CH {i + 1}</button>
        ))}
      </div>
      <span className="follow-note-hint"><Volume2 size={13} /> ikut layar</span>
    </div>
  ) : n === 2 ? (
    <div className="xfade">
      <span className={`xfade-label ${audioMix <= 0 ? 'is-on' : ''}`} style={ch(0)}>CH 1</span>
      <div className="xfade-track">
        <input
          type="range" className="range xfader"
          min="-100" max="100" value={audioMix}
          aria-label="Crossfader CH 1 – CH 2"
          onChange={e => onCrossfader(Number(e.target.value))}
        />
      </div>
      <span className={`xfade-label ${audioMix >= 0 ? 'is-on' : ''}`} style={ch(1)}>CH 2</span>
    </div>
  ) : (
    <div className="segmented is-mono" role="radiogroup" aria-label="Channel yang terdengar">
      {slots.map(i => (
        <button key={i} role="radio" aria-checked={solo === i} onClick={() => onSolo(i)} style={ch(i)} data-tip={`Dengarkan CH ${i + 1} saja · ${i + 1}`}>
          CH {i + 1}
        </button>
      ))}
      <button role="radio" aria-checked={solo === MIX_ALL} onClick={() => onSolo(MIX_ALL)} data-tip="Dengarkan semua · 0">
        MIX
      </button>
    </div>
  );

  return (
    <div className="dock-area">
      <div className="dock" role="toolbar" aria-label="Kontrol">
        <div className="dock-group">
          <DockButton primary icon={<Search size={18} />} label={<>Cari<span className="hide-mobile"> live</span></>} tip="Cari siaran live · S" onClick={onOpenSearch} />
          <DockButton icon={<Library size={18} />} label="Library" tip="Library · L" onClick={onOpenLibrary} badge={liveFollows} />
        </div>

        <span className="dock-sep" aria-hidden="true" />
        <div className="dock-audio">{audio}</div>
        <span className="dock-sep" aria-hidden="true" />

        <div className="dock-group">
          <DockButton
            icon={<SlidersHorizontal size={18} />}
            label="Mixer"
            tip={masterMuted ? 'Mixer · master sedang mute' : 'Mixer volume'}
            onClick={onToggleMixer}
            expanded={mixerOpen}
            warn={masterMuted}
          />
          <DockButton icon={<MessagesSquare size={18} />} label="Chat" tip="Chat gabungan" onClick={onToggleCombinedChat} pressed={combinedChatOpen} />
          <DockButton
            icon={theater ? <Minimize size={18} /> : <Expand size={18} />}
            label="Teater"
            tip={theater ? 'Keluar mode teater · F' : 'Mode teater · F'}
            onClick={onToggleTheater}
            pressed={theater}
          />
          <DockButton icon={<Link2 size={18} />} label="Bagikan" tip="Salin link untuk dibagikan" onClick={onShare} />
          <DockButton icon={<Settings size={18} />} label="Atur" tip="Pengaturan" onClick={onOpenSettings} />
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
