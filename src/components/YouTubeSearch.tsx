"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Radio, Loader2 } from 'lucide-react';

interface SearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  viewerCount?: string | null;
}

interface Props {
  onSelect: (channelIndex: number, videoId: string) => void;
  onClose: () => void;
  channelCount: number;
}

const YouTubeSearch: React.FC<Props> = ({ onSelect, onClose, channelCount }) => {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(0); // Default to CH 1
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (searchQuery?: string) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Error ${res.status}`);
      }
      const data: SearchResult[] = await res.json();
      setResults(data);
      setSearchedQuery(q);
    } catch (e: any) {
      setError(e.message || 'Gagal mencari. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    
    // Automatically load recommended live streams on open
    search('live');

    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatViewers = (v: string | null | undefined) => {
    if (!v) return null;
    const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
    if (isNaN(n)) return null;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}rb`;
    return String(n);
  };

  return (
    <div className="yt-search-backdrop" onClick={onClose}>
      <div className="yt-search-modal" onClick={e => e.stopPropagation()}>
        <div className="yt-search-header">
          <div className="yt-search-title-group">
            <Radio size={15} className="yt-search-live-icon" />
            <span>Cari YouTube Live</span>
          </div>
          <button className="yt-search-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Target Channel Selector */}
        <div className="yt-search-target-bar">
          <span className="yt-search-target-label">Target Channel:</span>
          <div className="yt-search-target-options">
            {Array.from({ length: channelCount }).map((_, idx) => (
              <button
                key={idx}
                className={`yt-search-target-btn ${selectedChannel === idx ? 'active' : ''}`}
                onClick={() => setSelectedChannel(idx)}
              >
                CH {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="yt-search-bar">
          <input
            ref={inputRef}
            type="text"
            className="yt-search-input"
            placeholder="Cari siaran live YouTube..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(); }}
          />
          <button className="yt-search-btn" onClick={() => search()} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>

        {error && <p className="yt-search-error">{error}</p>}

        {results.length > 0 && (
          <div className="yt-search-results">
            <div className="yt-search-results-title">
              {searchedQuery === 'live' && !query ? 'Live Populer Saat Ini' : `Hasil Pencarian: "${searchedQuery}"`}
            </div>
            {results.map(r => {
              const viewers = formatViewers(r.viewerCount);
              return (
                <button
                  key={r.videoId}
                  className="yt-search-item"
                  onClick={() => { onSelect(selectedChannel, r.videoId); onClose(); }}
                >
                  <div className="yt-search-thumb-wrapper">
                    <img src={r.thumbnail} alt={r.title} className="yt-search-thumb" />
                    <span className="yt-search-live-badge">LIVE</span>
                    {viewers && (
                      <span className="yt-search-viewer-badge">
                        <span className="yt-search-pulse-dot" />
                        {viewers} menonton
                      </span>
                    )}
                  </div>
                  <div className="yt-search-meta">
                    <p className="yt-search-title">{r.title}</p>
                    <p className="yt-search-channel">{r.channelName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && results.length === 0 && query && !error && (
          <p className="yt-search-empty">Tidak ada siaran live ditemukan untuk "{query}"</p>
        )}
      </div>
    </div>
  );
};

export default YouTubeSearch;
