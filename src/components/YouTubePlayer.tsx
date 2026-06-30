"use client";

import React, { useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeProps } from 'react-youtube';
import { Maximize, Radio, MessageSquare, MessageSquareOff, Settings } from 'lucide-react';
import CustomLiveChat from './CustomLiveChat';
import { type AppSettings, DEFAULT_SETTINGS } from './SettingsPanel';

interface YouTubePlayerProps {
  videoId: string;
  targetVolume: number;
  isFocused: boolean;
  settings?: AppSettings;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, targetVolume, isFocused, settings = DEFAULT_SETTINGS }) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isReadyToReveal, setIsReadyToReveal] = useState(false);
  const [qualities, setQualities] = useState<string[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [isAdPlaying, setIsAdPlaying] = useState(false);

  const formatQuality = (q: string) => {
    const map: Record<string, string> = {
      highres: '4K',
      hd2160: '2160p',
      hd1440: '1440p HD',
      hd1080: '1080p HD',
      hd720: '720p HD',
      large: '480p',
      medium: '360p',
      small: '240p',
      tiny: '144p',
      auto: 'Auto'
    };
    return map[q] || q;
  };

  // Delay revealing the video until YouTube's native title disappears
  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        setIsReadyToReveal(true);
      }, 2500); // 2.5 seconds gives YouTube enough time to hide its native UI
      return () => clearTimeout(timer);
    }
  }, [isPlaying]);

  // Poll for progress updates
  useEffect(() => {
    let interval: number;
    if (isPlaying && playerRef.current) {
      interval = window.setInterval(async () => {
        const time = await playerRef.current.getCurrentTime();
        const len = await playerRef.current.getDuration();
        setCurrentTime(time || 0);
        setDuration(len || 0);
        // If duration is 0 or very close to it after playing, it's likely a livestream
        if (len === 0) setIsLive(true);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const fadeIntervalRef = useRef<number | null>(null);

  // Smooth Audio Transition Effect
  useEffect(() => {
    if (!playerRef.current) return;

    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current);
    }

    if (playerRef.current.isMuted()) {
      playerRef.current.unMute();
      playerRef.current.setVolume(0);
    }

    const currentVolPromise = playerRef.current.getVolume();
    
    Promise.resolve(currentVolPromise).then((startVol) => {
      startVol = startVol || 0;
      
      if (startVol === targetVolume) {
        playerRef.current.setVolume(targetVolume);
        return;
      }
      
      const durationMs = 500; // Fast smooth transition for slider changes
      const startTime = performance.now();
      
      fadeIntervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        let progress = elapsed / durationMs;
        
        if (progress >= 1) {
          playerRef.current.setVolume(targetVolume);
          window.clearInterval(fadeIntervalRef.current!);
          return;
        }

        const newVol = Math.round(startVol + (targetVolume - startVol) * progress);
        playerRef.current.setVolume(newVol);
      }, 16); 
    });

    return () => {
      if (fadeIntervalRef.current !== null) {
        window.clearInterval(fadeIntervalRef.current);
      }
    };
  }, [targetVolume]); 

  // We don't need manual volume slider anymore, the master mixer handles it.

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;

    // Check if live
    const len = event.target.getDuration();
    if (len === 0) setIsLive(true);

    // Detect ads via undocumented but widely-used events
    event.target.addEventListener('onAdStart', () => setIsAdPlaying(true));
    event.target.addEventListener('onAdEnd', () => setIsAdPlaying(false));

    // Force play + seek to live edge if live and autoLiveSync is on
    event.target.playVideo();
    if (len === 0 && settings.autoLiveSync) event.target.seekTo(999999, true);

    // Apply volume AFTER a tiny tick so browser doesn't block it
    setTimeout(() => {
      if (!playerRef.current) return;
      if (targetVolume > 0) {
        playerRef.current.unMute();
        playerRef.current.setVolume(targetVolume);
      } else {
        playerRef.current.mute();
        playerRef.current.setVolume(0);
      }
    }, 300);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1 /* playing */) {
      setIsPlaying(true);
      
      const availableQualities = event.target.getAvailableQualityLevels();
      if (availableQualities && availableQualities.length > 0) {
        setQualities(availableQualities);
      }
      setCurrentQuality(event.target.getPlaybackQuality());

      if (targetVolume > 0) {
        event.target.unMute();
        event.target.setVolume(targetVolume);
      } else {
        event.target.mute();
      }
    } else if (event.data === 2 /* paused */ || event.data === -1 /* unstarted */ || event.data === 5 /* cued */) {
      // Force play to ensure it never stays paused / unstarted
      event.target.playVideo();
    } else if (event.data === 3 /* buffering */) {
      // Buffering is fine, just waiting — no action needed
    }
  };

  const handleQualityChange = (quality: string) => {
    if (playerRef.current) {
      playerRef.current.setPlaybackQuality(quality);
    }
    setCurrentQuality(quality);
    setShowQualityMenu(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
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

  const toggleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowChat(!showChat);
  };

  const syncToLiveEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current && isLive) {
      // Seek to an arbitrarily large number to force the player to the live edge
      playerRef.current.seekTo(999999, true);
      if (!isPlaying) playerRef.current.playVideo();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`player-container ${isFocused ? 'active' : ''} ${showChat ? 'with-chat' : ''}`}
    >
      <div className="video-section">
        <div className="watermark-hider"></div>

        <div className={`initial-loading-screen ${isReadyToReveal ? 'hidden' : ''}`}>
          <div className="loading-spinner"></div>
        </div>

        {isAdPlaying && (
          <div className="ad-overlay">
            <div className="ad-badge">📢 Iklan Sedang Tayang</div>
            <p className="ad-sub">Video akan lanjut otomatis setelah iklan selesai</p>
          </div>
        )}

        <YouTube 
          videoId={videoId} 
          opts={opts} 
          onReady={onReady} 
          onStateChange={onStateChange}
          className="youtube-iframe-wrapper" 
        />

        {/* Custom UI Overlay */}
        <div className="custom-controls-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="controls-gradient-bg"></div>
          
          <div className="controls-content">
            {!isLive && (
              <div className="progress-container">
                <input 
                  type="range" 
                  className="progress-bar" 
                  min={0} 
                  max={duration} 
                  value={currentTime}
                  onChange={handleSeek}
                />
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
              </div>
            )}

            <div className="controls-row">
              <div className="controls-left">
                {isLive && (
                  <div className="live-indicator" onClick={syncToLiveEdge} title="Click to sync to live edge">
                    <Radio size={16} className="live-icon" />
                    <span>LIVE REALTIME</span>
                  </div>
                )}
              </div>

              <div className="controls-right">
                {qualities.length > 0 && (
                  <div className="quality-selector-container">
                    <button className="control-btn" onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }} title="Quality">
                      <Settings size={18} />
                    </button>
                    {showQualityMenu && (
                      <div className="quality-menu">
                        {qualities.map(q => (
                          <div 
                            key={q} 
                            className={`quality-option ${q === currentQuality ? 'active' : ''}`} 
                            onClick={() => handleQualityChange(q)}
                          >
                            {formatQuality(q)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isLive && (
                  <button 
                    className={`control-btn ${showChat ? 'chat-active' : ''}`} 
                    onClick={toggleChat} 
                    title={showChat ? "Turn Off Chat" : "Turn On Chat"}
                  >
                    {showChat ? (
                      <MessageSquare size={18} color="#ffffff" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.8))' }} />
                    ) : (
                      <MessageSquareOff size={18} color="#888888" />
                    )}
                  </button>
                )}

                <button className="control-btn" onClick={toggleFullscreen}>
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChat && isLive && (
        <div className="chat-section" onClick={(e) => e.stopPropagation()}>
          <CustomLiveChat videoId={videoId} />
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
