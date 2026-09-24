"use client";

import React, { useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { TUTORIAL_KEY } from './TutorialOverlay';
import Dialog, { DialogHeader } from './Dialog';
import ConfirmDialog from './ConfirmDialog';
import { ShortcutList } from './ShortcutHelp';
import { useToast } from './Toast';
import type { AppSettings } from '../lib/settings';
import type { Channel } from '../lib/channels';
import { CHANNEL_COLORS } from '../lib/chat';

// ─── Rows ────────────────────────────────────────────────────────────────────
const SettingText: React.FC<{ label: string; hint?: string; id?: string }> = ({ label, hint, id }) => (
  <div className="setting-text">
    <span className="setting-label" id={id}>{label}</span>
    {hint && <span className="setting-hint">{hint}</span>}
  </div>
);

const SliderRow: React.FC<{
  label: string; hint?: string;
  min: number; max: number; step: number;
  value: number; unit: string;
  onChange: (v: number) => void;
}> = ({ label, hint, min, max, step, value, unit, onChange }) => (
  <div className="setting">
    <SettingText label={label} hint={hint} />
    <div className="setting-range">
      <input
        type="range" className="range" min={min} max={max} step={step} value={value}
        style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }}
        aria-label={label}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className="setting-value">{value}{unit}</span>
    </div>
  </div>
);

const ToggleRow: React.FC<{
  label: string; hint?: string;
  value: boolean; onChange: (v: boolean) => void;
}> = ({ label, hint, value, onChange }) => (
  <div className="setting">
    <SettingText label={label} hint={hint} />
    <button className="switch" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} />
  </div>
);

function SegmentedRow<T extends string>({ label, hint, options, value, onChange }: {
  label: string; hint?: string;
  options: { value: T; label: string }[];
  value: T; onChange: (v: T) => void;
}) {
  const id = `seg-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="setting is-stacked">
      <SettingText label={label} hint={hint} id={id} />
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {options.map(o => (
          <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClearUrls: () => void;
  channels: Channel[];
  onChannelChange: (idx: number, url: string) => void;
  onChannelSubmit: (idx: number, url: string) => void;   // Enter / blur: resolves @handles
}

type TabId = 'screens' | 'audio' | 'chat' | 'keys' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'screens', label: 'Layar' },
  { id: 'audio', label: 'Audio' },
  { id: 'chat', label: 'Chat' },
  { id: 'keys', label: 'Shortcut' },
  { id: 'about', label: 'Tentang' },
];

const COUNT_OPTIONS: { count: 2 | 3 | 4; label: string }[] = [
  { count: 2, label: '2 layar' },
  { count: 3, label: '3 layar' },
  { count: 4, label: '4 layar' },
];

const SettingsPanel: React.FC<Props> = ({ onClose, settings, onChange, onClearUrls, channels, onChannelChange, onChannelSubmit }) => {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('screens');
  const [confirmClear, setConfirmClear] = useState(false);
  const set = (partial: Partial<AppSettings>) => onChange({ ...settings, ...partial });

  const count = settings.channelCount;

  return (
    <Dialog label="Pengaturan" onClose={onClose}>
      <DialogHeader title="Pengaturan" onClose={onClose} />

      <div className="tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="dialog-body">

        {/* ── LAYAR ── */}
        {tab === 'screens' && (
          <div className="stack-lg">
            <div className="layout-options" role="radiogroup" aria-label="Jumlah layar">
              {COUNT_OPTIONS.map(o => (
                <button
                  key={o.count}
                  role="radio"
                  aria-checked={count === o.count}
                  className="layout-option"
                  onClick={() => set({ channelCount: o.count })}
                >
                  <span className="layout-glyph" data-count={o.count}>
                    {Array.from({ length: o.count }).map((_, i) => <span key={i} />)}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>

            <SegmentedRow
              label="Tata letak"
              hint="Spotlight: satu layar besar, sisanya kecil di samping"
              options={[{ value: 'grid', label: 'Grid' }, { value: 'spotlight', label: 'Spotlight' }]}
              value={settings.layoutMode}
              onChange={v => set({ layoutMode: v })}
            />
            {settings.layoutMode === 'spotlight' && (
              <ToggleRow
                label="Layar besar ikut audio"
                hint="Channel yang sedang terdengar otomatis jadi layar besar"
                value={settings.spotlightFollowsAudio}
                onChange={v => set({ spotlightFollowsAudio: v })}
              />
            )}

            <div className="stack">
              <h3 className="section-title">Siaran</h3>
              <div className="channel-inputs">
                {Array.from({ length: count }).map((_, idx) => (
                  <div key={idx} className="channel-input">
                    <label className="ch-chip" htmlFor={`stg-ch-${idx}`} style={{ ['--ch' as string]: CHANNEL_COLORS[idx] }}>
                      CH {idx + 1}
                    </label>
                    <input
                      id={`stg-ch-${idx}`}
                      type="text"
                      className="input"
                      placeholder="Link YouTube, ID video, atau @channel"
                      value={channels[idx]?.url || ''}
                      onChange={e => onChannelChange(idx, e.target.value)}
                      onBlur={e => onChannelSubmit(idx, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onChannelSubmit(idx, e.currentTarget.value); }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <h3 className="section-title">Di HP</h3>
              <SegmentedRow
                label="Tampilan"
                hint="Geser: satu layar penuh, pindah dengan swipe"
                options={[{ value: 'swipe', label: 'Geser' }, { value: 'stack', label: 'Tumpuk' }]}
                value={settings.mobileMode}
                onChange={v => set({ mobileMode: v })}
              />
              {settings.mobileMode === 'swipe' && (
                <ToggleRow
                  label="Audio ikut layar"
                  hint="Hanya layar yang sedang terlihat yang terdengar"
                  value={settings.swipeAudioFollows}
                  onChange={v => set({ swipeAudioFollows: v })}
                />
              )}
            </div>
          </div>
        )}

        {/* ── AUDIO ── */}
        {tab === 'audio' && (
          <div className="stack-lg">
            <SegmentedRow
              label="Kurva crossfader"
              hint="Standar: keduanya penuh di tengah · Constant power: volume terasa rata · Cut: pindah tajam di ujung"
              options={[
                { value: 'standard', label: 'Standar' },
                { value: 'power', label: 'Constant power' },
                { value: 'cut', label: 'Cut' },
              ]}
              value={settings.crossfaderCurve}
              onChange={v => set({ crossfaderCurve: v })}
            />
            <SliderRow
              label="Kecepatan fade"
              hint="Durasi fade saat memakai shortcut 1 / 2 / 3"
              min={200} max={2000} step={100}
              value={settings.crossfaderSpeed} unit="ms"
              onChange={v => set({ crossfaderSpeed: v })}
            />
            <ToggleRow
              label="Otomatis ke posisi live"
              hint="Lompat ke bagian live terbaru saat siaran dimuat atau dilanjutkan"
              value={settings.autoLiveSync}
              onChange={v => set({ autoLiveSync: v })}
            />
          </div>
        )}

        {/* ── CHAT ── */}
        {tab === 'chat' && (
          <div className="stack-lg">
            <div className="setting is-stacked">
              <SettingText label="Kata terblokir" hint="Pesan yang mengandung kata ini disembunyikan. Pisahkan dengan koma." />
              <input
                className="input"
                placeholder="spam, promo, …"
                value={settings.chatBlockedWords}
                onChange={e => set({ chatBlockedWords: e.target.value })}
                aria-label="Kata terblokir"
              />
            </div>
            <ToggleRow
              label="Tandai member"
              value={settings.showMemberBadge}
              onChange={v => set({ showMemberBadge: v })}
            />
            <ToggleRow
              label="Tandai moderator"
              value={settings.showModBadge}
              onChange={v => set({ showModBadge: v })}
            />
          </div>
        )}

        {/* ── SHORTCUT ── */}
        {tab === 'keys' && <ShortcutList />}

        {/* ── TENTANG ── */}
        {tab === 'about' && (
          <div className="stack-lg">
            <div className="about">
              <div className="about-mark" aria-hidden="true"><span /><span /></div>
              <p className="about-name">DoubleWatch</p>
              <p className="about-sub">Tonton beberapa YouTube live sekaligus dengan kontrol audio penuh.</p>
            </div>

            <div className="danger-zone">
              <button className="btn btn-block" onClick={() => {
                try { localStorage.removeItem(TUTORIAL_KEY); } catch {}
                toast('Tutorial akan muncul lagi saat halaman dibuka kembali.', 3500);
              }}>
                <RefreshCw size={15} /> Tampilkan tutorial lagi
              </button>
              <button className="btn btn-block btn-danger" onClick={() => setConfirmClear(true)}>
                <Trash2 size={15} /> Kosongkan semua layar
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Kosongkan semua layar?"
          message="Semua siaran yang sedang diputar akan dihapus. Preset dan riwayat di Library tidak ikut terhapus."
          confirmLabel="Kosongkan"
          danger
          onConfirm={() => { setConfirmClear(false); onClearUrls(); onClose(); toast('Semua layar dikosongkan'); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </Dialog>
  );
};

export default SettingsPanel;
