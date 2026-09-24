"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import YouTubePlayer, { type VideoInfo } from '../components/YouTubePlayer';
import TutorialOverlay from '../components/TutorialOverlay';
import EmptyChannel from '../components/EmptyChannel';
import SettingsPanel from '../components/SettingsPanel';
import YouTubeSearch from '../components/YouTubeSearch';
import LibraryPanel, { type FollowState } from '../components/LibraryPanel';
import ControlBar from '../components/ControlBar';
import MixerPanel from '../components/MixerPanel';
import ShortcutHelp from '../components/ShortcutHelp';
import CombinedChat from '../components/CombinedChat';
import SplitDivider from '../components/SplitDivider';
import { ToastProvider, useToast } from '../components/Toast';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAutoHide } from '../hooks/useAutoHide';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from '../lib/settings';
import { DEFAULT_LEVELS, MAX_CHANNELS, MIX_ALL, computeVolumes, loadLevels, saveLevels, type MixerLevels } from '../lib/mixer';
import { computeGrid } from '../lib/layout';
import { loadQualityTargets, saveQualityTargets, type QualityTarget } from '../lib/quality';
import {
  emptyChannels, loadChannels, persistChannel, channelsFromShareLink, shareUrl, watchUrl, type Channel,
} from '../lib/channels';
import {
  loadFollows, loadHistory, loadPresets, saveFollows, saveHistory, savePresets, withHistoryEntry,
  type Follow, type HistoryEntry, type Preset, type VideoRef,
} from '../lib/library';
import { extractHandle, extractVideoId, type ChannelStatus } from '../lib/youtube';

type Panel = 'settings' | 'search' | 'library' | 'help' | 'mixer' | null;

const FOLLOW_CHECK_MS = 5 * 60_000;
const setAt = <T,>(arr: T[], i: number, v: T) => arr.map((x, j) => (j === i ? v : x));
const swapAt = <T,>(arr: T[], a: number, b: number) => arr.map((x, j) => (j === a ? arr[b] : j === b ? arr[a] : x));

async function fetchChannelStatus(handle: string): Promise<ChannelStatus | { error: string }> {
  try {
    const res = await fetch(`/api/resolve?handle=${encodeURIComponent(handle)}`);
    const data = await res.json();
    return res.ok ? data : { error: data.error || 'Gagal memeriksa channel.' };
  } catch {
    return { error: 'Gagal terhubung. Periksa koneksi internet.' };
  }
}

function App() {
  const toast = useToast();

  const [panel,         setPanel]         = useState<Panel>(null);
  const [searchPreset,  setSearchPreset]  = useState({ query: '', channel: 0 });
  const [combinedChat,  setCombinedChat]  = useState(false);
  const [theater,       setTheater]       = useState(false);
  const [settings,      setSettings]      = useState<AppSettings>(DEFAULT_SETTINGS);
  const [channels,      setChannels]      = useState<Channel[]>(emptyChannels);
  const [levels,        setLevels]        = useState<MixerLevels>(DEFAULT_LEVELS);
  const [paused,        setPaused]        = useState<boolean[]>(() => Array(MAX_CHANNELS).fill(false));
  const [chatOn,        setChatOn]        = useState<boolean[]>(() => Array(MAX_CHANNELS).fill(false));
  const [qualityTargets, setQualityTargets] = useState<QualityTarget[]>(() => Array(MAX_CHANNELS).fill('auto'));
  const [videoInfo,     setVideoInfo]     = useState<Record<string, VideoRef>>({});
  const [presets,       setPresets]       = useState<Preset[]>([]);
  const [history,       setHistory]       = useState<HistoryEntry[]>([]);
  const [follows,       setFollows]       = useState<Follow[]>([]);
  const [followStatus,  setFollowStatus]  = useState<Record<string, FollowState>>({});
  const [spotlightSlot, setSpotlightSlot] = useState(0);
  const [visibleSlot,   setVisibleSlot]   = useState(0);

  // Audio: crossfader (-100..100) for 2ch, solo index (or MIX_ALL) for 3-4ch
  const [audioMix,      setAudioMix]      = useState(-100);
  const [activeChannel, setActiveChannel] = useState(0);

  const mainRef = useRef<HTMLElement>(null);
  const mixRef = useRef(audioMix);
  const fadeIntervalRef = useRef<number | null>(null);
  const theaterFullscreenRef = useRef(false);
  const dockReveal = useAutoHide(2500);

  useEffect(() => { mixRef.current = audioMix; }, [audioMix]);

  /* ── Load saved state (and a shared link) on first mount ── */
  useEffect(() => {
    let loadedSettings = loadSettings();
    let loadedChannels = loadChannels();

    // A shared link overrides the saved channels and layout
    const shared = channelsFromShareLink(window.location.search);
    if (shared) {
      loadedChannels = emptyChannels().map((empty, i) => shared[i] ?? empty);
      loadedChannels.forEach((ch, i) => persistChannel(i, ch));
      const count = Math.min(MAX_CHANNELS, Math.max(2, shared.length)) as AppSettings['channelCount'];
      loadedSettings = { ...loadedSettings, channelCount: count };
      saveSettings(loadedSettings);
    }
    // Drop ?v= from the address bar so later channel changes aren't confused with the shared set
    const params = new URLSearchParams(window.location.search);
    if (params.has('v')) {
      params.delete('v');
      const rest = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }

    setSettings(loadedSettings);
    setChannels(loadedChannels);
    setLevels(loadLevels());
    setQualityTargets(loadQualityTargets());
    setPresets(loadPresets());
    setHistory(loadHistory());
    setFollows(loadFollows());
  }, []);

  /* ── Derived layout & audio ── */
  const n = settings.channelCount;
  const slots = Array.from({ length: n }, (_, i) => i);
  const soloChannel = activeChannel >= n ? 0 : activeChannel; // 4 → 3 screens must not solo an off-screen channel

  const isMobile = useMediaQuery('(max-width: 768px)');
  const swipe = isMobile && settings.mobileMode === 'swipe';
  const shownSlot = Math.min(visibleSlot, n - 1);
  const swipeAudioSlot = swipe && settings.swipeAudioFollows ? shownSlot : null;

  const volumes = computeVolumes({
    n, audioMix, curve: settings.crossfaderCurve, solo: soloChannel, levels, forceSolo: swipeAudioSlot,
  });

  const audioSlot = n === 2 ? (audioMix > 0 ? 1 : 0) : soloChannel === MIX_ALL ? null : soloChannel;
  const bigSlot = Math.min(settings.spotlightFollowsAudio && audioSlot !== null ? audioSlot : spotlightSlot, n - 1);
  const grid = computeGrid({ n, mode: settings.layoutMode, bigSlot, splitRatio: settings.splitRatio, isMobile });
  const showDivider = !swipe && settings.layoutMode === 'grid' && n === 2;

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const handleLevelsChange = (l: MixerLevels) => {
    setLevels(l);
    saveLevels(l);
  };

  /* ── Crossfade helper ── */
  const fadeTo = (target: number) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const startMix = mixRef.current;
    if (startMix === target) return;
    const durationMs = settings.crossfaderSpeed;
    const startTime  = performance.now();
    const ease       = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    fadeIntervalRef.current = window.setInterval(() => {
      const progress = Math.min((performance.now() - startTime) / durationMs, 1);
      setAudioMix(startMix + (target - startMix) * ease(progress));
      if (progress >= 1) { setAudioMix(target); clearInterval(fadeIntervalRef.current!); }
    }, 16);
  };

  const onCrossfader = (value: number) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    setAudioMix(value);
  };

  /* ── Channels ── */
  const updateChannel = (idx: number, val: string) => {
    const ch = { url: val, id: extractVideoId(val) };
    if (ch.id !== channels[idx].id) {
      // A new video on this screen starts playing, with chat off
      setPaused(p => setAt(p, idx, false));
      setChatOn(c => setAt(c, idx, false));
    }
    setChannels(prev => setAt(prev, idx, ch));
    persistChannel(idx, ch);
  };

  const playInSlot = (idx: number, videoId: string) => updateChannel(idx, watchUrl(videoId));

  /** Plays a channel's current live stream on screen `idx`; false if it isn't live. */
  const resolveHandleInto = async (idx: number, handle: string): Promise<boolean> => {
    const status = await fetchChannelStatus(handle);
    if ('error' in status) { toast(status.error); return false; }
    if (!status.live || !status.videoId) { toast(`${status.name} sedang tidak live`); return false; }
    playInSlot(idx, status.videoId);
    toast(`Memutar live ${status.name}`);
    return true;
  };

  // Settings input: Enter / blur on an @handle resolves it to the live stream
  const submitChannelInput = (idx: number, val: string) => {
    if (extractVideoId(val)) return;
    const handle = extractHandle(val);
    if (handle) resolveHandleInto(idx, handle);
  };

  const swapChannels = (a: number, b: number) => {
    setChannels(prev => {
      const next = swapAt(prev, a, b);
      persistChannel(a, next[a]);
      persistChannel(b, next[b]);
      return next;
    });
    setPaused(p => swapAt(p, a, b));
    setChatOn(c => swapAt(c, a, b));
  };

  const clearAllUrls = () => {
    emptyChannels().forEach((ch, i) => persistChannel(i, ch));
    setChannels(emptyChannels());
  };

  const openSearch = (query = '', channel?: number) => {
    // Default the target to the first empty screen, so picking a result fills it
    const firstEmpty = channels.slice(0, n).findIndex(c => !c.id);
    setSearchPreset({ query, channel: channel ?? Math.max(0, firstEmpty) });
    setPanel('search');
  };

  const promote = (slot: number) => {
    setSpotlightSlot(slot);
    if (!settings.spotlightFollowsAudio) return;
    if (n === 2) fadeTo(slot === 0 ? -100 : 100);
    else setActiveChannel(slot);
  };

  const onInfo = useCallback((info: VideoInfo) => {
    const ref: VideoRef = { id: info.videoId, title: info.title, author: info.author };
    setVideoInfo(prev => ({ ...prev, [info.videoId]: ref }));
    setHistory(prev => {
      const next = withHistoryEntry(prev, ref);
      saveHistory(next);
      return next;
    });
  }, []);

  /* ── Share link ── */
  const copyShareLink = async () => {
    const ids = channels.slice(0, n).map(c => c.id);
    if (!ids.some(Boolean)) {
      toast('Isi minimal satu channel dulu');
      return;
    }
    const url = shareUrl(ids);
    try {
      await navigator.clipboard.writeText(url);
      toast('Link disalin!');
    } catch {
      window.prompt('Salin link ini:', url);
    }
  };

  /* ── Library ── */
  const handlePresetsChange = (next: Preset[]) => {
    setPresets(next);
    savePresets(next);
  };

  const applyPreset = (p: Preset) => {
    const next = emptyChannels().map((empty, i) => (p.videos[i] ? { url: watchUrl(p.videos[i]!.id), id: p.videos[i]!.id } : empty));
    next.forEach((ch, i) => persistChannel(i, ch));
    setChannels(next);
    setPaused(Array(MAX_CHANNELS).fill(false));
    setChatOn(Array(MAX_CHANNELS).fill(false));
    handleSettingsChange({ ...settings, channelCount: p.channelCount });
    toast(`Preset "${p.name}" diterapkan`);
  };

  const followStatusRef = useRef(followStatus);
  useEffect(() => { followStatusRef.current = followStatus; });

  const checkFollows = useCallback(async (list: Follow[], notify: boolean) => {
    if (!notify) setFollowStatus(prev => ({ ...prev, ...Object.fromEntries(list.map(f => [f.handle, { state: 'checking' }])) }));
    await Promise.all(list.map(async f => {
      const result = await fetchChannelStatus(f.handle);
      const prev = followStatusRef.current[f.handle];
      const wasLive = prev?.state === 'done' && prev.status.live;
      const next: FollowState = 'error' in result ? { state: 'error', message: result.error } : { state: 'done', status: result };
      if (notify && next.state === 'done' && next.status.live && !wasLive) {
        toast(`🔴 ${f.name} sedang live! Buka Library untuk menonton.`, 5000);
      }
      setFollowStatus(s => ({ ...s, [f.handle]: next }));
    }));
  }, [toast]);

  // Check followed channels shortly after load, then every few minutes while the tab is visible
  useEffect(() => {
    if (follows.length === 0) return;
    const first = window.setTimeout(() => checkFollows(follows, false), 3000);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') checkFollows(follows, true);
    }, FOLLOW_CHECK_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [follows, checkFollows]);

  const follow = async (handle: string): Promise<string | null> => {
    const result = await fetchChannelStatus(handle);
    if ('error' in result) return result.error;
    const next = [...follows, { handle: result.handle, name: result.name }];
    setFollows(next);
    saveFollows(next);
    setFollowStatus(s => ({ ...s, [result.handle]: { state: 'done', status: result } }));
    toast(result.live ? `Mengikuti ${result.name} — sedang live!` : `Mengikuti ${result.name}`);
    return null;
  };

  const unfollow = (handle: string) => {
    const next = follows.filter(f => f.handle !== handle);
    setFollows(next);
    saveFollows(next);
  };

  const liveFollows = follows.filter(f => {
    const s = followStatus[f.handle];
    return s?.state === 'done' && s.status.live;
  }).length;

  /* ── Theater mode ── */
  const toggleTheater = useCallback(() => {
    if (theater) {
      setTheater(false);
      if (theaterFullscreenRef.current && document.fullscreenElement) document.exitFullscreen();
      theaterFullscreenRef.current = false;
      return;
    }
    setTheater(true);
    toast('Mode Teater — tekan F atau Esc untuk keluar');
    // iOS Safari can't fullscreen the page; theater still hides the mixer there
    document.documentElement.requestFullscreen?.()
      .then(() => { theaterFullscreenRef.current = true; })
      .catch(() => {});
  }, [theater, toast]);

  useEffect(() => {
    const onChange = () => {
      if (theaterFullscreenRef.current && !document.fullscreenElement) {
        theaterFullscreenRef.current = false;
        setTheater(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // In theater mode the dock slides in on any pointer movement or tap, then hides when idle
  const onAppPointerMove = () => {
    if (theater) dockReveal.poke();
  };
  // Keep it up while a panel opened from it is showing
  const dockVisible = dockReveal.visible || panel !== null;

  const handleQualityTargets = (next: QualityTarget[]) => {
    setQualityTargets(next);
    saveQualityTargets(next);
  };

  const setLevel = (slot: number, level: number) =>
    handleLevelsChange({ ...levels, trims: setAt(levels.trims, slot, level), mutes: setAt(levels.mutes, slot, false) });

  const toggleMute = (slot: number) => {
    const unmuting = levels.mutes[slot];
    handleLevelsChange({
      ...levels,
      mutes: setAt(levels.mutes, slot, !unmuting),
      // Unmuting a channel turned all the way down should make it audible again
      trims: unmuting && levels.trims[slot] === 0 ? setAt(levels.trims, slot, 50) : levels.trims,
    });
  };

  /* ── Mobile swipe: track which screen is visible ── */
  useEffect(() => {
    const main = mainRef.current;
    if (!swipe || !main) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setVisibleSlot(Number((entry.target as HTMLElement).dataset.slot));
      }
    }, { root: main, threshold: 0.6 });
    main.querySelectorAll('.screen').forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [swipe, n]);

  const scrollToSlot = (slot: number) => {
    const main = mainRef.current;
    main?.scrollTo({ left: slot * main.clientWidth, behavior: 'smooth' });
  };

  /* ── Keyboard shortcuts ── */
  const togglePauseAll = () => {
    const active = slots.filter(i => channels[i].id);
    const anyPlaying = active.some(i => !paused[i]);
    setPaused(p => p.map((v, i) => (active.includes(i) ? anyPlaying : v)));
  };

  const toggleChatAll = () => {
    const active = slots.filter(i => channels[i].id);
    const anyOff = active.some(i => !chatOn[i]);
    setChatOn(c => c.map((v, i) => (active.includes(i) ? anyOff : v)));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      switch (key) {
        case ' ':
          if (el?.tagName === 'BUTTON') return; // let Space press the focused button
          togglePauseAll(); break;
        case 'c': toggleChatAll(); break;
        case 'f': toggleTheater(); break;
        case 'm': handleLevelsChange({ ...levels, masterMuted: !levels.masterMuted }); break;
        case 's': case '/': openSearch(); break;
        case 'l': setPanel('library'); break;
        case '?': setPanel('help'); break;
        default:
          if (n === 2) {
            if      (key === '1' || key === 'ArrowLeft')                     fadeTo(-100);
            else if (key === '2' || key === 'ArrowRight')                    fadeTo(100);
            else if (['0', '3', 'ArrowUp', 'ArrowDown'].includes(key))       fadeTo(0);
            else return;
          } else {
            const num = Number(key);
            if      (key === '0')                                   setActiveChannel(MIX_ALL);
            else if (Number.isInteger(num) && num >= 1 && num <= n) setActiveChannel(num - 1);
            else return;
          }
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const titles = slots.map(i => videoInfo[channels[i].id]?.title ?? '');

  return (
    <>
      {panel === 'settings' && (
        <SettingsPanel
          onClose={() => setPanel(null)}
          settings={settings}
          onChange={handleSettingsChange}
          onClearUrls={clearAllUrls}
          channels={channels}
          onChannelChange={updateChannel}
          onChannelSubmit={submitChannelInput}
        />
      )}

      {panel === 'search' && (
        <YouTubeSearch
          channelCount={n}
          playingIds={channels.slice(0, n).map(c => c.id)}
          initialQuery={searchPreset.query}
          initialChannel={searchPreset.channel}
          onSelect={playInSlot}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === 'library' && (
        <LibraryPanel
          n={n}
          channels={channels}
          videoInfo={videoInfo}
          presets={presets}
          onPresetsChange={handlePresetsChange}
          onApplyPreset={applyPreset}
          history={history}
          onClearHistory={() => { setHistory([]); saveHistory([]); }}
          follows={follows}
          followStatus={followStatus}
          onFollow={follow}
          onUnfollow={unfollow}
          onRefreshFollows={() => checkFollows(follows, false)}
          onPlay={playInSlot}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === 'help' && <ShortcutHelp onClose={() => setPanel(null)} />}

      <div
        className={`app ${theater ? 'is-theater' : ''} ${theater && dockVisible ? 'dock-visible' : ''} ${!theater && !isMobile ? 'dock-reserved' : ''}`}
        onPointerMove={onAppPointerMove}
        onPointerDown={onAppPointerMove}
      >
        <TutorialOverlay />

        <div className="stage">
          <main
            ref={mainRef}
            className={`screens ${swipe ? 'is-swipe' : ''}`}
            style={swipe ? undefined : grid.style}
          >
            {slots.map(slot => {
              const ch = channels[slot];
              return (
                <section
                  key={slot}
                  data-slot={slot}
                  className={`screen ${swipe || grid.atBottom(slot) ? 'is-bottom' : ''}`}
                  style={swipe ? undefined : { gridArea: grid.areaOf(slot) }}
                  aria-label={`Layar CH ${slot + 1}`}
                >
                  {ch.id
                    ? <YouTubePlayer
                        key={ch.id}
                        videoId={ch.id}
                        slot={slot}
                        channelCount={n}
                        volume={volumes[slot]}
                        level={levels.trims[slot]}
                        muted={levels.mutes[slot]}
                        onLevelChange={v => setLevel(slot, v)}
                        onToggleMute={() => toggleMute(slot)}
                        settings={settings}
                        paused={paused[slot]}
                        onTogglePause={() => setPaused(p => setAt(p, slot, !p[slot]))}
                        showChat={chatOn[slot]}
                        onToggleChat={() => setChatOn(c => setAt(c, slot, !c[slot]))}
                        canPromote={settings.layoutMode === 'spotlight' && !swipe && slot !== bigSlot}
                        onPromote={() => promote(slot)}
                        onReplace={() => openSearch('', slot)}
                        onSwap={target => swapChannels(slot, target)}
                        onClear={() => updateChannel(slot, '')}
                        onInfo={onInfo}
                        qualityTarget={qualityTargets[slot]}
                        onQualityTargetChange={q => handleQualityTargets(setAt(qualityTargets, slot, q))}
                        onQualityTargetAll={q => { handleQualityTargets(Array(MAX_CHANNELS).fill(q)); toast('Resolusi diterapkan ke semua layar'); }}
                      />
                    : <EmptyChannel
                        channel={slot + 1}
                        onUrlSubmit={url => updateChannel(slot, url)}
                        onHandleSubmit={handle => resolveHandleInto(slot, handle)}
                        onSearch={q => openSearch(q, slot)}
                      />
                  }
                </section>
              );
            })}

            {showDivider && (
              <SplitDivider
                ratio={settings.splitRatio}
                orientation={isMobile ? 'horizontal' : 'vertical'}
                containerRef={mainRef}
                onDrag={r => setSettings(s => ({ ...s, splitRatio: r }))}
                onCommit={r => handleSettingsChange({ ...settings, splitRatio: r })}
              />
            )}
          </main>

          {/* With "audio follows screen" the bar has the screen switcher; otherwise show dots */}
          {swipe && swipeAudioSlot === null && (
            <div className="swipe-dots" role="tablist" aria-label="Pilih layar">
              {slots.map(slot => (
                <button
                  key={slot}
                  role="tab"
                  aria-selected={slot === shownSlot}
                  aria-label={`Layar CH ${slot + 1}`}
                  className="swipe-dot"
                  onClick={() => scrollToSlot(slot)}
                />
              ))}
            </div>
          )}

          {combinedChat && (
            <CombinedChat
              videoIds={channels.slice(0, n).map(c => c.id)}
              settings={settings}
              onClose={() => setCombinedChat(false)}
            />
          )}
        </div>

        <ControlBar
          n={n}
          audioMix={audioMix}
          onCrossfader={onCrossfader}
          solo={soloChannel}
          onSolo={setActiveChannel}
          swipeAudioSlot={swipeAudioSlot}
          onSelectScreen={scrollToSlot}
          masterMuted={levels.masterMuted}
          liveFollows={liveFollows}
          mixerOpen={panel === 'mixer'}
          combinedChatOpen={combinedChat}
          theater={theater}
          onOpenSearch={() => openSearch()}
          onOpenLibrary={() => setPanel('library')}
          onToggleMixer={() => setPanel(p => (p === 'mixer' ? null : 'mixer'))}
          onToggleCombinedChat={() => setCombinedChat(c => !c)}
          onToggleTheater={toggleTheater}
          onShare={copyShareLink}
          onOpenSettings={() => setPanel('settings')}
        />

        {panel === 'mixer' && (
          <MixerPanel
            n={n}
            levels={levels}
            volumes={volumes}
            titles={titles}
            onChange={handleLevelsChange}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
