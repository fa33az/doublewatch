"use client";

import React, { useState } from 'react';
import { X, Radio, Trash2, Pencil, Check, Play, RefreshCw, Plus } from 'lucide-react';
import Dialog, { DialogHeader } from './Dialog';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import type { Channel } from '../lib/channels';
import { newId, timeAgo, type Follow, type HistoryEntry, type Preset, type VideoRef } from '../lib/library';
import { extractHandle, thumbnailUrl, type ChannelStatus } from '../lib/youtube';
import { CHANNEL_COLORS } from '../lib/chat';

export type FollowState =
  | { state: 'checking' }
  | { state: 'done'; status: ChannelStatus }
  | { state: 'error'; message: string };

interface LibraryPanelProps {
  n: number;
  channels: Channel[];
  videoInfo: Record<string, VideoRef>;
  presets: Preset[];
  onPresetsChange: (presets: Preset[]) => void;
  onApplyPreset: (preset: Preset) => void;
  history: HistoryEntry[];
  onClearHistory: () => void;
  follows: Follow[];
  followStatus: Record<string, FollowState>;
  onFollow: (handle: string) => Promise<string | null>;   // resolves to an error message, or null
  onUnfollow: (handle: string) => void;
  onRefreshFollows: () => void;
  onPlay: (slot: number, videoId: string) => void;
  onClose: () => void;
}

type Tab = 'presets' | 'history' | 'follows';

const TABS: { id: Tab; label: string }[] = [
  { id: 'presets', label: 'Preset' },
  { id: 'history', label: 'Riwayat' },
  { id: 'follows', label: 'Diikuti' },
];

const TargetPicker: React.FC<{ n: number; value: number; onChange: (v: number) => void }> = ({ n, value, onChange }) => (
  <div className="search-row">
    <span className="search-row-label">Putar di</span>
    <div className="segmented is-mono" role="radiogroup" aria-label="Putar di channel">
      {Array.from({ length: n }, (_, i) => (
        <button key={i} role="radio" aria-checked={value === i} onClick={() => onChange(i)}>CH {i + 1}</button>
      ))}
    </div>
  </div>
);

const LibraryPanel: React.FC<LibraryPanelProps> = ({
  n, channels, videoInfo, presets, onPresetsChange, onApplyPreset, history, onClearHistory,
  follows, followStatus, onFollow, onUnfollow, onRefreshFollows, onPlay, onClose,
}) => {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('presets');
  const [target, setTarget] = useState(0);
  const [presetName, setPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [followInput, setFollowInput] = useState('');
  const [followError, setFollowError] = useState('');
  const [following, setFollowing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const current = channels.slice(0, n);
  const hasChannels = current.some(c => c.id);

  const savePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChannels) return;
    const preset: Preset = {
      id: newId(),
      name: presetName.trim() || `Preset ${presets.length + 1}`,
      channelCount: n as Preset['channelCount'],
      videos: current.map(c => (c.id ? { id: c.id, title: videoInfo[c.id]?.title ?? '', author: videoInfo[c.id]?.author ?? '' } : null)),
      createdAt: Date.now(),
    };
    onPresetsChange([preset, ...presets]);
    setPresetName('');
    toast(`Preset “${preset.name}” disimpan`);
  };

  const renamePreset = (id: string) => {
    const name = editName.trim();
    if (name) onPresetsChange(presets.map(p => (p.id === id ? { ...p, name } : p)));
    setEditingId(null);
  };

  const follow = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = extractHandle(followInput);
    if (!handle) { setFollowError('Masukkan @handle atau link channel YouTube.'); return; }
    if (follows.some(f => f.handle.toLowerCase() === handle.toLowerCase())) { setFollowError('Channel ini sudah diikuti.'); return; }
    setFollowing(true);
    const error = await onFollow(handle);
    setFollowing(false);
    if (error) setFollowError(error);
    else setFollowInput('');
  };

  return (
    <Dialog label="Library" onClose={onClose}>
      <DialogHeader title="Library" onClose={onClose} />

      <div className="tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'history' && history.length > 0 && <span className="num" style={{ color: 'var(--text-3)' }}>{history.length}</span>}
          </button>
        ))}
      </div>

      <div className="dialog-body">
        {/* ── PRESETS ── */}
        {tab === 'presets' && (
          <div className="stack-lg">
            <form className="search-form" onSubmit={savePreset}>
              <input
                className="input"
                placeholder="Nama preset, mis. “Berita pagi”"
                value={presetName}
                maxLength={40}
                onChange={e => setPresetName(e.target.value)}
                aria-label="Nama preset"
              />
              <button type="submit" className="btn btn-primary" disabled={!hasChannels}>
                <Plus size={16} /> Simpan
              </button>
            </form>

            {presets.length === 0 ? (
              <p className="empty-state">
                {hasChannels
                  ? 'Simpan kombinasi siaran yang sedang diputar untuk dibuka lagi nanti.'
                  : 'Putar minimal satu siaran, lalu simpan kombinasinya di sini.'}
              </p>
            ) : (
              <div className="stack">
                {presets.map(p => (
                  <div key={p.id} className="preset">
                    <div className="preset-head">
                      {editingId === p.id ? (
                        <input
                          className="input"
                          value={editName}
                          autoFocus
                          maxLength={40}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renamePreset(p.id);
                            if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
                          }}
                          aria-label="Nama preset baru"
                        />
                      ) : (
                        <span className="preset-name">{p.name}</span>
                      )}
                      <span className="preset-count">{p.channelCount} layar</span>
                    </div>
                    <div className="preset-thumbs">
                      {p.videos.map((v, i) => (
                        <div key={i} className="preset-thumb" title={v?.title || 'Kosong'}>
                          {v ? <img src={thumbnailUrl(v.id)} alt="" loading="lazy" /> : '—'}
                          <span className="ch-chip" style={{ ['--ch' as string]: CHANNEL_COLORS[i] }}>CH{i + 1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="preset-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => { onApplyPreset(p); onClose(); }}>
                        <Play size={14} /> Buka
                      </button>
                      <span className="spacer" />
                      {editingId === p.id ? (
                        <button className="icon-btn" onClick={() => renamePreset(p.id)} aria-label="Simpan nama"><Check size={16} /></button>
                      ) : (
                        <button className="icon-btn" onClick={() => { setEditingId(p.id); setEditName(p.name); }} aria-label={`Ganti nama ${p.name}`}>
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={() => { onPresetsChange(presets.filter(x => x.id !== p.id)); toast('Preset dihapus'); }}
                        aria-label={`Hapus ${p.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          history.length === 0 ? (
            <p className="empty-state">Riwayat masih kosong. Siaran yang kamu tonton akan muncul di sini.</p>
          ) : (
            <div className="stack">
              <TargetPicker n={n} value={target} onChange={setTarget} />
              <div>
                {history.map(h => (
                  <button key={h.id} className="row" onClick={() => { onPlay(target, h.id); onClose(); }}>
                    <img src={thumbnailUrl(h.id)} alt="" className="row-thumb" loading="lazy" />
                    <span className="row-text">
                      <span className="row-title">{h.title || h.id}</span>
                      <span className="row-sub">{h.author}{h.author && ' · '}{timeAgo(h.watchedAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={15} /> Hapus riwayat
              </button>
            </div>
          )
        )}

        {/* ── FOLLOWS ── */}
        {tab === 'follows' && (
          <div className="stack-lg">
            <div className="stack">
              <form className="search-form" onSubmit={follow}>
                <input
                  className="input"
                  placeholder="@handle atau link channel"
                  value={followInput}
                  onChange={e => { setFollowInput(e.target.value); setFollowError(''); }}
                  aria-label="Channel yang ingin diikuti"
                  aria-invalid={Boolean(followError)}
                />
                <button type="submit" className="btn btn-primary" disabled={following || !followInput.trim()}>
                  {following ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'currentColor' }} /> : <Plus size={16} />} Ikuti
                </button>
              </form>
              {followError && <p className="field-error" role="alert">{followError}</p>}
            </div>

            {follows.length === 0 ? (
              <p className="empty-state">Ikuti channel favorit untuk melihat kapan mereka live. Kamu akan diberi tahu saat mereka mulai siaran.</p>
            ) : (
              <div className="stack">
                <TargetPicker n={n} value={target} onChange={setTarget} />
                <div>
                  {follows.map(f => {
                    const s = followStatus[f.handle];
                    const live = s?.state === 'done' && s.status.live ? s.status : null;
                    return (
                      <div key={f.handle} className="row">
                        {live?.videoId
                          ? <img src={thumbnailUrl(live.videoId)} alt="" className="row-thumb" loading="lazy" />
                          : <span className="row-thumb"><Radio size={18} /></span>}
                        <span className="row-text">
                          <span className="row-title">
                            {f.name}
                            {s?.state === 'checking' && <span className="status">MEMERIKSA</span>}
                            {s?.state === 'error' && <span className="status">GAGAL</span>}
                            {s?.state === 'done' && (live ? <span className="status is-live">LIVE</span> : <span className="status">OFFLINE</span>)}
                          </span>
                          <span className="row-sub">{live?.title || f.handle}</span>
                        </span>
                        {live?.videoId && (
                          <button className="btn btn-primary btn-sm" onClick={() => { onPlay(target, live.videoId!); onClose(); }}>
                            <Play size={14} /> Tonton
                          </button>
                        )}
                        <button className="icon-btn" onClick={() => onUnfollow(f.handle)} aria-label={`Berhenti mengikuti ${f.name}`}>
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn-ghost" onClick={onRefreshFollows}>
                  <RefreshCw size={15} /> Periksa ulang
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Hapus riwayat?"
          message="Semua siaran di riwayat tontonan akan dihapus."
          confirmLabel="Hapus"
          danger
          onConfirm={() => { onClearHistory(); setConfirmClear(false); toast('Riwayat dihapus'); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </Dialog>
  );
};

export default LibraryPanel;
