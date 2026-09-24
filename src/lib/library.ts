import { readJSON, writeJSON } from './storage';

export interface VideoRef {
  id: string;
  title: string;
  author: string;
}

export interface Preset {
  id: string;
  name: string;
  channelCount: 2 | 3 | 4;
  videos: (VideoRef | null)[];   // per slot
  createdAt: number;
}

export interface HistoryEntry extends VideoRef {
  watchedAt: number;
}

export interface Follow {
  handle: string;   // '@name' or 'UC…'
  name: string;
}

const KEYS = {
  presets: 'dw_presets',
  history: 'dw_history',
  follows: 'dw_follows',
  searches: 'dw_recent_searches',
};

const MAX_HISTORY = 50;
const MAX_SEARCHES = 8;

export const loadPresets = () => readJSON<Preset[]>(KEYS.presets, []);
export const savePresets = (presets: Preset[]) => writeJSON(KEYS.presets, presets);

export const loadHistory = () => readJSON<HistoryEntry[]>(KEYS.history, []);
export const saveHistory = (history: HistoryEntry[]) => writeJSON(KEYS.history, history);

export const loadFollows = () => readJSON<Follow[]>(KEYS.follows, []);
export const saveFollows = (follows: Follow[]) => writeJSON(KEYS.follows, follows);

export const loadRecentSearches = () => readJSON<string[]>(KEYS.searches, []);

/** Records a search query (most recent first, deduped); returns the new list. */
export function addRecentSearch(query: string): string[] {
  const q = query.trim();
  const next = [q, ...loadRecentSearches().filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_SEARCHES);
  writeJSON(KEYS.searches, next);
  return next;
}

/** Moves (or adds) a video to the top of the history. */
export const withHistoryEntry = (history: HistoryEntry[], video: VideoRef): HistoryEntry[] =>
  [{ ...video, watchedAt: Date.now() }, ...history.filter(h => h.id !== video.id)].slice(0, MAX_HISTORY);

export const newId = () => Math.random().toString(36).slice(2, 10);

/** "5 mnt lalu", "2 jam lalu", "3 hari lalu" */
export function timeAgo(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
