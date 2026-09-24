"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { extractHandle, extractVideoId } from '../lib/youtube';
import { CHANNEL_COLORS } from '../lib/chat';

interface EmptyChannelProps {
  channel: number;
  onUrlSubmit: (url: string) => void;
  onHandleSubmit: (handle: string) => Promise<boolean>;   // true if a live stream was found
  onSearch: (query: string) => void;
}

// Quick searches instead of fixed video IDs — 24/7 streams get restarted under new IDs
const EXAMPLES = ['Lofi', 'Berita', 'Musik'];

const EmptyChannel: React.FC<EmptyChannelProps> = ({ channel, onUrlSubmit, onHandleSubmit, onSearch }) => {
  const [val, setVal] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = val.trim();
    if (!v || busy) return;
    if (extractVideoId(v)) { onUrlSubmit(v); return; }

    const handle = extractHandle(v);
    if (!handle) { setError('Link YouTube tidak dikenali'); return; }
    setBusy(true);
    const found = await onHandleSubmit(handle);
    setBusy(false);
    if (!found) setError(`${handle} sedang tidak live`);
  };

  return (
    <div className="empty">
      <div className="empty-inner">
        <span className="ch-chip" style={{ ['--ch' as string]: CHANNEL_COLORS[channel - 1] }}>CH {channel}</span>
        <h3 className="empty-title">Tambahkan siaran</h3>
        <p className="empty-hint">Tempel link YouTube, ID video, atau @channel</p>

        <form className="empty-form" onSubmit={submit}>
          <input
            type="text"
            className="input"
            placeholder="youtube.com/live/… atau @channel"
            value={val}
            aria-label={`Link untuk CH ${channel}`}
            aria-invalid={Boolean(error)}
            onChange={e => { setVal(e.target.value); setError(''); }}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !val.trim()}>
            {busy ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'currentColor' }} /> : 'Putar'}
          </button>
        </form>
        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="empty-alt">
          <button className="btn btn-ghost btn-sm" onClick={() => onSearch('')}><Search size={14} /> Cari live</button>
          <span className="empty-alt-label">atau</span>
          {EXAMPLES.map(q => (
            <button key={q} className="chip" onClick={() => onSearch(q.toLowerCase())}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmptyChannel;
