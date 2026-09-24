"use client";

import React, { useState } from 'react';
import { ArrowLeftRight, Maximize2, Search, Volume2, VolumeX, X } from 'lucide-react';
import { CHANNEL_COLORS } from '../lib/chat';
import { formatCount } from '../lib/youtube';

interface PaneToolbarProps {
  slot: number;
  channelCount: number;
  onAir: boolean;
  chipVisible: boolean;   // flash the chip even while the rest of the controls are hidden
  title: string;
  author: string;
  isLive: boolean;
  viewers: number | null;
  canPromote: boolean;
  onPromote: () => void;
  onReplace: () => void;
  onSwap: (target: number) => void;
  onClear: () => void;
}

/** Top of a screen: channel chip, stream info and actions — shown with the controls (the chip also flashes on audio changes). */
const PaneToolbar: React.FC<PaneToolbarProps> = ({
  slot, channelCount, onAir, chipVisible, title, author, isLive, viewers, canPromote, onPromote, onReplace, onSwap, onClear,
}) => {
  const [swapOpen, setSwapOpen] = useState(false);
  const others = Array.from({ length: channelCount }, (_, i) => i).filter(i => i !== slot);

  const swap = () => {
    if (others.length === 1) onSwap(others[0]);
    else setSwapOpen(o => !o);
  };

  const meta = [author, isLive && viewers !== null ? `${formatCount(viewers)} menonton` : ''].filter(Boolean).join(' · ');

  return (
    <div className="screen-header">
      <span
        className={`ch-chip screen-chip ${chipVisible ? 'is-flash' : ''}`}
        style={{ ['--ch' as string]: CHANNEL_COLORS[slot] }}
        data-on-air={onAir}
        title={onAir ? 'Sedang terdengar' : 'Tidak terdengar'}
      >
        {onAir ? <Volume2 size={12} /> : <VolumeX size={12} />}
        CH {slot + 1}
      </span>

      <div className="screen-info player-ui">
        <span className="screen-title" title={title}>{title || 'Memuat…'}</span>
        {meta && <span className="screen-meta">{meta}</span>}
      </div>

      <div className="screen-actions player-ui">
        {canPromote && (
          <button className="overlay-btn" onClick={onPromote} aria-label="Jadikan layar utama" title="Jadikan layar utama">
            <Maximize2 size={16} />
          </button>
        )}
        <button className="overlay-btn" onClick={onReplace} aria-label="Ganti siaran" title="Ganti siaran">
          <Search size={16} />
        </button>
        <div className="menu-anchor">
          <button
            className="overlay-btn"
            onClick={swap}
            aria-label="Tukar posisi"
            aria-haspopup={others.length > 1 ? 'menu' : undefined}
            aria-expanded={others.length > 1 ? swapOpen : undefined}
            title="Tukar posisi"
          >
            <ArrowLeftRight size={16} />
          </button>
          {swapOpen && (
            <div className="menu is-below" role="menu">
              {others.map(i => (
                <button key={i} className="menu-item" role="menuitem" onClick={() => { setSwapOpen(false); onSwap(i); }}>
                  Tukar dengan CH {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="overlay-btn" onClick={onClear} aria-label="Kosongkan layar" title="Kosongkan layar">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaneToolbar;
