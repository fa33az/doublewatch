"use client";

import React, { useRef } from 'react';
import { Volume2, VolumeX, RotateCcw, X } from 'lucide-react';
import { DEFAULT_LEVELS, type MixerLevels } from '../lib/mixer';
import { CHANNEL_COLORS } from '../lib/chat';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface MixerPanelProps {
  n: number;
  levels: MixerLevels;
  volumes: number[];   // actual output per channel, for the meters
  titles: string[];
  onChange: (levels: MixerLevels) => void;
  onClose: () => void;
}

interface StripProps {
  label: string;
  sub?: string;
  color?: string;
  value: number;
  muted: boolean;
  output?: number;
  onValue: (v: number) => void;
  onMute: () => void;
}

const Strip: React.FC<StripProps> = ({ label, sub, color, value, muted, output, onValue, onMute }) => (
  <div className={`strip ${muted ? 'is-muted' : ''}`}>
    <div className="strip-head">
      <span className="strip-name" style={color ? { color } : undefined}>{label}</span>
      {sub && <span className="strip-sub" title={sub}>{sub}</span>}
    </div>
    <div className="strip-controls">
      <input
        type="range" min={0} max={100} value={value}
        className="range"
        style={{ ['--p' as string]: `${value}%` }}
        aria-label={`Volume ${label}`}
        onChange={e => onValue(Number(e.target.value))}
      />
      <span className="strip-value">{value}%</span>
      <button className="icon-btn" onClick={onMute} aria-pressed={muted} aria-label={`Mute ${label}`} title={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
    {output !== undefined && (
      <div className="meter" aria-hidden="true"><span style={{ width: `${output}%` }} /></div>
    )}
  </div>
);

/** Per-channel trim + mute and a master level; a popover above the bar, a sheet on phones. */
const MixerPanel: React.FC<MixerPanelProps> = ({ n, levels, volumes, titles, onChange, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);

  const setAt = <T,>(arr: T[], i: number, v: T) => arr.map((x, j) => (j === i ? v : x));

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div ref={ref} className="popover" role="dialog" aria-modal="true" aria-label="Mixer volume" tabIndex={-1}>
        <div className="dialog-header">
          <h2 className="dialog-title">Mixer</h2>
          <button className="icon-btn" onClick={() => onChange(DEFAULT_LEVELS)} aria-label="Reset mixer" title="Reset semua ke 100%">
            <RotateCcw size={16} />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup mixer"><X size={18} /></button>
        </div>

        <div className="popover-body">
          {Array.from({ length: n }, (_, i) => (
            <Strip
              key={i}
              label={`CH ${i + 1}`}
              sub={titles[i]}
              color={CHANNEL_COLORS[i]}
              value={levels.trims[i]}
              muted={levels.mutes[i]}
              output={volumes[i]}
              onValue={v => onChange({ ...levels, trims: setAt(levels.trims, i, v) })}
              onMute={() => onChange({ ...levels, mutes: setAt(levels.mutes, i, !levels.mutes[i]) })}
            />
          ))}

          <div className="popover-divider" />

          <Strip
            label="MASTER"
            value={levels.master}
            muted={levels.masterMuted}
            onValue={v => onChange({ ...levels, master: v })}
            onMute={() => onChange({ ...levels, masterMuted: !levels.masterMuted })}
          />
          <p className="popover-hint">Garis hijau = volume yang benar-benar keluar setelah crossfader / pilihan channel.</p>
        </div>
      </div>
    </>
  );
};

export default MixerPanel;
