"use client";

import React from 'react';
import { Tv } from 'lucide-react';

interface EmptyChannelProps {
  channel: number;
  onUrlSubmit: (url: string) => void;
}

const EmptyChannel: React.FC<EmptyChannelProps> = ({ channel, onUrlSubmit }) => {
  const [val, setVal] = React.useState('');

  const submit = () => {
    if (val.trim()) onUrlSubmit(val.trim());
  };

  return (
    <div className="empty-channel">
      <div className="ec-noise" />
      <div className="ec-content">
        <Tv size={56} className="ec-icon" strokeWidth={0.9} />
        <h3 className="ec-title">Channel {channel}</h3>
        <p className="ec-desc">Paste link atau ID YouTube untuk mulai menonton</p>

        <div className="ec-input-row">
          <input
            type="text"
            className="ec-input"
            placeholder="https://youtube.com/watch?v=..."
            value={val}
            autoFocus={channel === 1}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          />
          <button className="ec-btn" onClick={submit}>▶</button>
        </div>

        <div className="ec-examples">
          <span className="ec-ex-label">Coba:</span>
          <button className="ec-ex-tag" onClick={() => onUrlSubmit('jNQXAC9IVRw')}>Contoh #1</button>
          <button className="ec-ex-tag" onClick={() => onUrlSubmit('dQw4w9WgXcQ')}>Contoh #2</button>
        </div>
      </div>
    </div>
  );
};

export default EmptyChannel;
