"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeProps } from 'react-youtube';
import { Maximize, MessageSquare, MessageSquareOff, Play, Pause, Volume1, Volume2, VolumeX, Check } from 'lucide-react';
import ChatPanel from './ChatPanel';
import PaneToolbar from './PaneToolbar';
import StreamEndedCard from './StreamEndedCard';
import type { AppSettings } from '../lib/settings';
import { QUALITY_TARGETS, qualityFrameStyle, type QualityTarget } from '../lib/quality';
import { useVideoMeta } from '../hooks/useVideoMeta';
import { useAutoHide } from '../hooks/useAutoHide';

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
}

interface YouTubePlayerProps {
  videoId: string;
  slot: number;
  channelCount: number;
  volume: number;           // actual output after crossfader / solo / mixer
  level: number;            // this channel's own volume (mixer trim), 0–100
  muted: boolean;
  onLevelChange: (level: number) => void;
  onToggleMute: () => void;
  settings: AppSettings;
  paused: boolean;
  onTogglePause: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  canPromote: boolean;
  onPromote: () => void;
  onReplace: () => void;
  onSwap: (target: number) => void;
  onClear: () => void;
  onInfo: (info: VideoInfo) => void;
  qualityTarget: QualityTarget;
  onQualityTargetChange: (target: QualityTarget) => void;
  onQualityTargetAll: (target: QualityTarget) => void;
}

// YouTube IFrame API onError codes
const ERROR_MESSAGES: Record<number, string> = {
  2: 'Link video tidak valid.',
  5: 'Video ini tidak bisa diputar di browser ini.',
  100: 'Video tidak ditemukan, dihapus, atau privat.',
  101: 'Pemilik video tidak mengizinkan video ini diputar di situs lain.',
  150: 'Pemilik video tidak mengizinkan video ini diputar di situs lain.',
};

// YouTube's playback quality names → labels (what is actually playing, shown on the resolution button)
const QUALITY_LABELS: Record<string, string> = {
  highres: '4K', hd2160: '4K', hd1440: '1440p', hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p',
};

const LIVE_EDGE = 999_999; // seeking past the end jumps a live stream to its live edge

type EndState = { kind: 'ended' | 'error'; message: string } | null;

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId, slot, channelCount, volume, level, muted, onLevelChange, onToggleMute, settings, paused, onTogglePause, showChat, onToggleChat,
  canPromote, onPromote, onReplace, onSwap, onClear, onInfo, qualityTarget, onQualityTargetChange, onQualityTargetAll,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durationIsZero, setDurationIsZero] = useState(false);
  const [videoData, setVideoData] = useState<{ title: string; author: string } | null>(null);
  const [quality, setQuality] = useState('');
  const [endState, setEndState] = useState<EndState>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const meta = useVideoMeta(videoId);
  const controls = useAutoHide(3000);

  // The CH chip hides with the controls, but flashes briefly when this screen starts or
  // stops being audible (and on load) so it's always clear which one you're hearing
  const chipFlash = useAutoHide(1800);
  const onAir = volume > 0;
  const pokeChip = chipFlash.poke;
  useEffect(() => { pokeChip(); }, [onAir, pokeChip]);

  /* ── Resolution: size the iframe for the chosen quality, then scale it to fit (see lib/quality) ── */
  const videoRef = useRef<HTMLDivElement>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [qualityMenu, setQualityMenu] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setVideoSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frameStyle = qualityFrameStyle(
    qualityTarget, videoSize.width, videoSize.height,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  );

  const isLive = durationIsZero || meta?.isLive === true;
  const title = meta?.title || videoData?.title || '';
  const author = meta?.author || videoData?.author || '';

  // Latest values for YouTube callbacks, which are bound once per player
  const pausedRef = useRef(paused);
  const volumeRef = useRef(volume);
  const liveRef = useRef(isLive);
  const metaLiveRef = useRef(meta?.isLive);
  const autoSyncRef = useRef(settings.autoLiveSync);
  useEffect(() => {
    volumeRef.current = volume;
    liveRef.current = isLive;
    metaLiveRef.current = meta?.isLive;
    autoSyncRef.current = settings.autoLiveSync;
  });

  const endCheckRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(endCheckRef.current), []);

  /* ── Report title once known (used for history and presets) ── */
  const reportedRef = useRef(false);
  useEffect(() => {
    if (title && !reportedRef.current) {
      reportedRef.current = true;
      onInfo({ videoId, title, author });
    }
  }, [title, author, videoId, onInfo]);

  /* ── A live stream that stops being live has ended ── */
  const sawLiveRef = useRef(false);
  useEffect(() => {
    if (!meta) return;
    if (meta.isLive) sawLiveRef.current = true;
    else if (meta.isLive === false && sawLiveRef.current) setEndState({ kind: 'ended', message: 'Siaran live ini sudah selesai.' });
  }, [meta]);

  /* ── Apply pause / resume from the parent ── */
  useEffect(() => {
    pausedRef.current = paused;
    const player = playerRef.current;
    if (!player) return;
    if (paused) {
      player.pauseVideo();
    } else {
      player.playVideo();
      if (liveRef.current && autoSyncRef.current) player.seekTo(LIVE_EDGE, true);
    }
  }, [paused]);

  /* ── Progress polling (VODs) ── */
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(async () => {
      const player = playerRef.current;
      if (!player) return;
      const time = await player.getCurrentTime();
      const len = await player.getDuration();
      setCurrentTime(time || 0);
      setDuration(len || 0);
      if (len === 0) setDurationIsZero(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  /* ── Smooth volume transitions ── */
  const fadeIntervalRef = useRef<number | null>(null);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (fadeIntervalRef.current !== null) window.clearInterval(fadeIntervalRef.current);

    if (player.isMuted()) {
      player.unMute();
      player.setVolume(0);
    }

    Promise.resolve(player.getVolume()).then((start: number) => {
      const startVol = start || 0;
      if (startVol === volume) {
        player.setVolume(volume);
        return;
      }
      const durationMs = 500;
      const startTime = performance.now();
      fadeIntervalRef.current = window.setInterval(() => {
        const progress = (performance.now() - startTime) / durationMs;
        if (progress >= 1) {
          player.setVolume(volume);
          window.clearInterval(fadeIntervalRef.current!);
          return;
        }
        player.setVolume(Math.round(startVol + (volume - startVol) * progress));
      }, 16);
    });

    return () => {
      if (fadeIntervalRef.current !== null) window.clearInterval(fadeIntervalRef.current);
    };
  }, [volume]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    const player = event.target;
    playerRef.current = player;

    const len = player.getDuration();
    if (len === 0) setDurationIsZero(true);

    // Not part of the documented API, but available on every IFrame player
    const data = player.getVideoData?.();
    if (data?.title) setVideoData({ title: data.title, author: data.author ?? '' });

    if (!pausedRef.current) {
      player.playVideo();
      if (len === 0 && autoSyncRef.current) player.seekTo(LIVE_EDGE, true);
    }

    // Apply volume after a tick so the browser doesn't block unmuting
    setTimeout(() => {
      if (!playerRef.current) return;
      const vol = volumeRef.current;
      if (vol > 0) { playerRef.current.unMute(); playerRef.current.setVolume(vol); }
      else { playerRef.current.mute(); playerRef.current.setVolume(0); }
    }, 300);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    const player = event.target;
    switch (event.data) {
      case 1: { // playing
        window.clearTimeout(endCheckRef.current);
        setIsPlaying(true);
        setQuality(player.getPlaybackQuality());
        const vol = volumeRef.current;
        if (vol > 0) { player.unMute(); player.setVolume(vol); } else { player.mute(); }
        break;
      }
      case 0: // ended
        if (!liveRef.current) {
          setEndState({ kind: 'ended', message: 'Video sudah selesai diputar.' });
          break;
        }
        // Seeking a live stream to its edge can briefly report "ended": nudge it and only
        // believe it if playback hasn't resumed and YouTube doesn't still list it as live
        player.playVideo();
        window.clearTimeout(endCheckRef.current);
        endCheckRef.current = window.setTimeout(() => {
          if (playerRef.current?.getPlayerState?.() === 0 && metaLiveRef.current !== true) {
            setEndState({ kind: 'ended', message: 'Siaran live ini sudah selesai.' });
          }
        }, 5000);
        break;
      case 2: case -1: case 5: // paused / unstarted / cued
        // Autoplay can be interrupted by the browser; resume unless the user paused
        if (!pausedRef.current) player.playVideo();
        break;
    }
  };

  const onError: YouTubeProps['onError'] = (event) => {
    setEndState({ kind: 'error', message: ERROR_MESSAGES[event.data] ?? 'Video tidak bisa diputar.' });
  };

  const retry = () => {
    playerRef.current = null;
    setEndState(null);
    setIsPlaying(false);
    sawLiveRef.current = false;
    setReloadKey(k => k + 1);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    playerRef.current?.seekTo(time, true);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  const syncToLiveEdge = () => {
    if (!playerRef.current || !isLive) return;
    playerRef.current.seekTo(LIVE_EDGE, true);
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      mute: 1, // Crucial to bypass browser autoplay blocks which cause the native UI to appear
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
    },
  };

  const chatPanel = showChat && isLive;
  const active = controls.visible || qualityMenu;
  const progress = duration ? (currentTime / duration) * 100 : 0;
  // Turned up here but silenced by the crossfader / channel selector
  const silent = !muted && level > 0 && volume === 0;

  return (
    <div
      ref={containerRef}
      className={`player ${active ? 'is-active' : ''}`}
      onPointerMove={controls.poke}
      onPointerDown={controls.poke}
      onPointerLeave={() => { if (!qualityMenu) controls.hide(); }}
    >
      <div className="player-video" ref={videoRef}>
        <YouTube
          key={reloadKey}
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onError}
          onPlaybackQualityChange={e => setQuality(String(e.data))}
          className="player-frame"
          style={frameStyle}
        />

        {!isPlaying && !endState && (
          <div className="player-state" role="status" aria-label="Memuat siaran">
            <div className="spinner" />
          </div>
        )}

        {endState && (
          <StreamEndedCard
            kind={endState.kind}
            message={endState.message}
            onFindReplacement={onReplace}
            onRetry={retry}
            onClear={onClear}
          />
        )}

        <PaneToolbar
          slot={slot}
          channelCount={channelCount}
          onAir={onAir}
          chipVisible={chipFlash.visible}
          title={title}
          author={author}
          isLive={isLive}
          viewers={meta?.viewers ?? null}
          canPromote={canPromote}
          onPromote={onPromote}
          onReplace={onReplace}
          onSwap={onSwap}
          onClear={onClear}
        />

        <div className="player-controls player-ui">
          {!isLive && duration > 0 && (
            <div className="seek">
              <input
                type="range"
                className="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Posisi video"
                style={{ ['--p' as string]: `${progress}%` }}
              />
            </div>
          )}

          <div className="controls-row">
            <button className="overlay-btn" onClick={onTogglePause} aria-label={paused ? 'Putar' : 'Jeda'} title={paused ? 'Putar (Spasi)' : 'Jeda (Spasi)'}>
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <div className={`volume ${silent ? 'is-silent' : ''}`}>
              <button
                className="overlay-btn"
                onClick={onToggleMute}
                aria-label={`Mute CH ${slot + 1}`}
                aria-pressed={muted}
                title={silent ? 'Tidak terdengar — atur di crossfader / pilihan channel' : muted ? 'Unmute' : 'Mute'}
              >
                {muted || level === 0 ? <VolumeX size={18} /> : level < 50 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                className="range volume-slider"
                min={0}
                max={100}
                value={muted ? 0 : level}
                onChange={e => onLevelChange(Number(e.target.value))}
                aria-label={`Volume CH ${slot + 1}`}
                style={{ ['--p' as string]: `${muted ? 0 : level}%` }}
              />
            </div>

            {isLive && (
              <button className="live-btn" onClick={syncToLiveEdge} title="Lompat ke posisi live terbaru">LIVE</button>
            )}

            <span className="spacer" />

            <div className="menu-anchor hide-narrow">
              <button
                className="quality-btn"
                onClick={() => setQualityMenu(m => !m)}
                aria-haspopup="menu"
                aria-expanded={qualityMenu}
                aria-label={`Resolusi: ${QUALITY_TARGETS.find(q => q.value === qualityTarget)?.label}`}
                title="Resolusi"
              >
                {QUALITY_LABELS[quality] ?? '—'}
                {qualityTarget !== 'auto' && <span className="quality-pin" aria-hidden="true" />}
              </button>
              {qualityMenu && (
                <div className="menu quality-menu" role="menu">
                  <p className="menu-title">Resolusi</p>
                  {QUALITY_TARGETS.map(q => (
                    <button
                      key={q.value}
                      role="menuitemradio"
                      aria-checked={q.value === qualityTarget}
                      className="menu-item"
                      onClick={() => { onQualityTargetChange(q.value); setQualityMenu(false); }}
                    >
                      <span className="menu-check">{q.value === qualityTarget && <Check size={14} />}</span>
                      {q.label}
                      {q.value === 'auto' && QUALITY_LABELS[quality] && <span className="menu-meta">{QUALITY_LABELS[quality]}</span>}
                    </button>
                  ))}
                  <div className="menu-divider" />
                  <button className="menu-item" role="menuitem" onClick={() => { onQualityTargetAll(qualityTarget); setQualityMenu(false); }}>
                    <span className="menu-check" />
                    Terapkan ke semua layar
                  </button>
                  <p className="menu-note">Tetap bergantung pada koneksi: YouTube bisa menurunkannya jika internet lambat.</p>
                </div>
              )}
            </div>

            {isLive && (
              <button
                className="overlay-btn"
                onClick={onToggleChat}
                aria-label={showChat ? 'Matikan chat' : 'Nyalakan chat'}
                aria-pressed={showChat}
                title={showChat ? 'Matikan chat (C)' : 'Nyalakan chat (C)'}
              >
                {showChat ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
              </button>
            )}

            <button className="overlay-btn" onClick={toggleFullscreen} aria-label="Layar penuh" title="Layar penuh">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>

      {chatPanel && (
        <aside className="player-chat" aria-label="Live chat">
          <ChatPanel videoId={videoId} settings={settings} />
        </aside>
      )}
    </div>
  );
};

export default YouTubePlayer;
