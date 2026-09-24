"use client";

import React from 'react';
import { Search, Volume1, Volume2, VolumeX } from 'lucide-react';
import AudioControl, { type AudioControlProps } from './AudioControl';
import { CHANNEL_COLORS } from '../lib/chat';
import type { VideoRef } from '../lib/library';

interface NowPanelProps extends AudioControlProps {
  videoIds: string[];                 // per slot; '' for empty screens
  videoInfo: Record<string, VideoRef>;
  volumes: number[];                  // actual output, for the on-air chip
  levels: number[];                   // per-channel volume (mixer trim)
  mutes: boolean[];
  onLevelChange: (slot: number, level: number) => void;
  onToggleMute: (slot: number) => void;
  onSearch: (slot: number) => void;
  swipe: boolean;
}

/** Phones in portrait: what's playing on each screen, with audio controls — sits under the videos like the YouTube app. */
const NowPanel: React.FC<NowPanelProps> = ({
  videoIds, videoInfo, volumes, levels, mutes, onLevelChange, onToggleMute, onSearch, swipe, ...audio
}) => (
  <section className="now-panel" aria-label="Sedang diputar">
    <div className="now-audio"><AudioControl {...audio} /></div>

    <div className="now-list">
      {videoIds.map((id, slot) => {
        const info = id ? videoInfo[id] : undefined;
        const level = mutes[slot] ? 0 : levels[slot];
        const chip = (
          <span className="ch-chip" style={{ ['--ch' as string]: CHANNEL_COLORS[slot] }} data-on-air={Boolean(id) && volumes[slot] > 0}>
            CH {slot + 1}
          </span>
        );

        if (!id) {
          return (
            <button key={slot} className="now-row is-empty" onClick={() => onSearch(slot)}>
              {chip}
              <span className="now-text">
                <span className="now-title">Layar kosong</span>
                <span className="now-sub">Ketuk untuk cari siaran live</span>
              </span>
              <Search size={18} />
            </button>
          );
        }

        return (
          <div key={slot} className="now-row">
            {swipe ? (
              <button className="now-select" onClick={() => audio.onSelectScreen(slot)} aria-label={`Tampilkan CH ${slot + 1}`}>{chip}</button>
            ) : chip}
            <span className="now-text">
              <span className="now-title">{info?.title || 'Memuat…'}</span>
              <span className="now-volume">
                <button
                  className="icon-btn"
                  onClick={() => onToggleMute(slot)}
                  aria-label={`Mute CH ${slot + 1}`}
                  aria-pressed={mutes[slot]}
                >
                  {level === 0 ? <VolumeX size={16} /> : level < 50 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range" className="range" min={0} max={100} value={level}
                  style={{ ['--p' as string]: `${level}%` }}
                  aria-label={`Volume CH ${slot + 1}`}
                  onChange={e => onLevelChange(slot, Number(e.target.value))}
                />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  </section>
);

export default NowPanel;
