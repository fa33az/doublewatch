"use client";

import React from 'react';
import { Settings, Search, Link2, Library, SlidersHorizontal, MessagesSquare, Expand, Minimize } from 'lucide-react';
import AudioControl, { type AudioControlProps } from './AudioControl';

interface ControlBarProps extends AudioControlProps {
  showAudio: boolean;              // false on phones in portrait: the audio control lives under the videos
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
  showAudio, masterMuted, liveFollows,
  mixerOpen, combinedChatOpen, theater,
  onOpenSearch, onOpenLibrary, onToggleMixer, onToggleCombinedChat, onToggleTheater, onShare, onOpenSettings,
  ...audioProps
}) => {
  return (
    <div className="dock-area">
      <div className="dock" role="toolbar" aria-label="Kontrol">
        <div className="dock-group">
          <DockButton primary icon={<Search size={18} />} label={<>Cari<span className="hide-mobile"> live</span></>} tip="Cari siaran live · S" onClick={onOpenSearch} />
          <DockButton icon={<Library size={18} />} label="Library" tip="Library · L" onClick={onOpenLibrary} badge={liveFollows} />
        </div>

        {showAudio && (
          <>
            <span className="dock-sep" aria-hidden="true" />
            <div className="dock-audio"><AudioControl {...audioProps} /></div>
            <span className="dock-sep" aria-hidden="true" />
          </>
        )}

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
