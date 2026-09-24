"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, History } from 'lucide-react';
import Dialog, { DialogHeader } from './Dialog';
import { formatCount, type SearchResult } from '../lib/youtube';
import { addRecentSearch, loadRecentSearches } from '../lib/library';

interface Props {
  onSelect: (channelIndex: number, videoId: string) => void;
  onClose: () => void;
  channelCount: number;
  playingIds: string[];        // per slot, to mark results already on screen
  initialQuery?: string;
  initialChannel?: number;
}

const CATEGORIES = ['Musik', 'Gaming', 'Berita', 'Olahraga', 'Lofi', 'Podcast'];
const DEFAULT_QUERY = 'live';
const DEBOUNCE_MS = 450;
const MIN_TYPED_CHARS = 2;

const YouTubeSearch: React.FC<Props> = ({ onSelect, onClose, channelCount, playingIds, initialQuery = '', initialChannel = 0 }) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(initialChannel);
  const [recent, setRecent] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  const search = async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    window.clearTimeout(debounceRef.current);

    // Cancel any in-flight search so a slower, older response can't overwrite this one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Error ${res.status}`);
      }
      const data: SearchResult[] = await res.json();
      setResults(data);
      setSearchedQuery(q);
      if (q !== DEFAULT_QUERY) setRecent(addRecentSearch(q));
    } catch (e) {
      if (controller.signal.aborted) return;
      setError((e as Error).message || 'Gagal mencari. Coba lagi.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  useEffect(() => {
    setRecent(loadRecentSearches());
    // Run the preset search, or load recommended live streams
    search(initialQuery || DEFAULT_QUERY);
    return () => {
      abortRef.current?.abort();
      window.clearTimeout(debounceRef.current);
    };
  }, []);

  // Search as you type, once the user pauses
  const onType = (value: string) => {
    setQuery(value);
    window.clearTimeout(debounceRef.current);
    if (value.trim().length >= MIN_TYPED_CHARS) {
      debounceRef.current = window.setTimeout(() => search(value), DEBOUNCE_MS);
    }
  };

  const pick = (q: string) => {
    setQuery(q);
    search(q);
  };

  const slotOf = (videoId: string) => playingIds.findIndex(id => id === videoId);
  const showRecent = !query && recent.length > 0;

  return (
    <Dialog label="Cari siaran live" onClose={onClose} size="lg">
      <DialogHeader title="Cari siaran live" onClose={onClose} />

      <div className="dialog-section stack">
        <form className="search-form" role="search" onSubmit={e => { e.preventDefault(); search(); }}>
          <input
            type="search"
            className="input"
            placeholder="Cari siaran live YouTube…"
            value={query}
            data-autofocus
            aria-label="Kata kunci pencarian"
            onChange={e => onType(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading} aria-label="Cari">
            {loading ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'currentColor' }} /> : <Search size={16} />}
          </button>
        </form>

        <div className="chips" aria-label={showRecent ? 'Pencarian terakhir' : 'Kategori'}>
          {showRecent && <History size={14} style={{ alignSelf: 'center', color: 'var(--text-3)' }} aria-hidden="true" />}
          {(showRecent ? recent : CATEGORIES).map(c => (
            <button
              key={c}
              className="chip"
              aria-pressed={searchedQuery.toLowerCase() === c.toLowerCase()}
              onClick={() => pick(showRecent ? c : c.toLowerCase())}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="search-row">
          <span className="search-row-label">Putar di</span>
          <div className="segmented is-mono" role="radiogroup" aria-label="Putar di channel">
            {Array.from({ length: channelCount }).map((_, idx) => (
              <button key={idx} role="radio" aria-checked={selectedChannel === idx} onClick={() => setSelectedChannel(idx)}>
                CH {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dialog-body" aria-busy={loading}>
        {error && <p className="field-error" role="alert">{error}</p>}

        {results.length > 0 && (
          <div className="results">
            <h3 className="section-title results-title">
              {searchedQuery === DEFAULT_QUERY ? 'Sedang populer' : `Hasil untuk “${searchedQuery}”`}
            </h3>
            {results.map(r => {
              const slot = slotOf(r.videoId);
              return (
                <button key={r.videoId} className="result" onClick={() => { onSelect(selectedChannel, r.videoId); onClose(); }}>
                  <div className="result-thumb">
                    <img src={r.thumbnail} alt="" loading="lazy" />
                    <span className="live-badge">LIVE</span>
                  </div>
                  <div className="result-info">
                    <p className="result-title">{r.title}</p>
                    <p className="result-meta">
                      {r.channelName}
                      {r.viewers !== null && <> · <span className="num">{formatCount(r.viewers)}</span> menonton</>}
                      {slot !== -1 && <span className="is-playing"> · Sedang di CH {slot + 1}</span>}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && results.length === 0 && searchedQuery && !error && (
          <p className="empty-state">Tidak ada siaran live untuk “{searchedQuery}”.</p>
        )}
        {loading && results.length === 0 && (
          <div className="empty-state"><span className="spinner" style={{ margin: '0 auto' }} /></div>
        )}
      </div>
    </Dialog>
  );
};

export default YouTubeSearch;
