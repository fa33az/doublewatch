"use client";

import React from 'react';
import { Volume2 } from 'lucide-react';
import { MIX_ALL } from '../lib/mixer';
import { CHANNEL_COLORS } from '../lib/chat';

export interface AudioControlProps {
  n: number;
  audioMix: number;
  onCrossfader: (value: number) => void;
  solo: number;
  onSolo: (slot: number) => void;
  swipeAudioSlot: number | null;   // phone swipe with "audio follows screen"
  onSelectScreen: (slot: number) => void;
}

const ch = (i: number) => ({ ['--ch' as string]: CHANNEL_COLORS[i] });

/** Crossfader (2 screens), solo/MIX selector (3–4 screens) or screen switcher (phone swipe mode). */
const AudioControl: React.FC<AudioControlProps> = ({ n, audioMix, onCrossfader, solo, onSolo, swipeAudioSlot, onSelectScreen }) => {
  const slots = Array.from({ length: n }, (_, i) => i);

  if (swipeAudioSlot !== null) {
    // The visible screen is the audible one; buttons jump between screens
    return (
      <div className="follow-note">
        <div className="segmented is-mono" role="tablist" aria-label="Pilih layar">
          {slots.map(i => (
            <button key={i} role="tab" aria-selected={swipeAudioSlot === i} onClick={() => onSelectScreen(i)} style={ch(i)}>CH {i + 1}</button>
          ))}
        </div>
        <span className="follow-note-hint"><Volume2 size={13} /> ikut layar</span>
      </div>
    );
  }

  if (n === 2) {
    return (
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
    );
  }

  return (
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
};

export default AudioControl;
