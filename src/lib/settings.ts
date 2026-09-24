import { readJSON, writeJSON } from './storage';

export type LayoutMode = 'grid' | 'spotlight';
export type CrossfaderCurve = 'standard' | 'power' | 'cut';
export type MobileMode = 'stack' | 'swipe';

export interface AppSettings {
  channelCount: 2 | 3 | 4;
  layoutMode: LayoutMode;
  spotlightFollowsAudio: boolean;
  splitRatio: number;            // 2-screen grid: CH 1 width share, 0.2–0.8
  mobileMode: MobileMode;
  swipeAudioFollows: boolean;    // mobile swipe: only the visible screen is audible

  crossfaderSpeed: number;
  crossfaderCurve: CrossfaderCurve;
  autoLiveSync: boolean;

  chatBlockedWords: string;      // comma separated
  showMemberBadge: boolean;
  showModBadge: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  channelCount: 2,
  layoutMode: 'grid',
  spotlightFollowsAudio: true,
  splitRatio: 0.5,
  mobileMode: 'swipe',
  swipeAudioFollows: true,

  crossfaderSpeed: 800,
  crossfaderCurve: 'standard',
  autoLiveSync: true,

  chatBlockedWords: '',
  showMemberBadge: true,
  showModBadge: true,
};

const STORAGE_KEY = 'dw_settings';

export function loadSettings(): AppSettings {
  // Merge so settings saved by older versions pick up new keys with their defaults
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<AppSettings>>(STORAGE_KEY, {}) };
}

export function saveSettings(s: AppSettings) {
  writeJSON(STORAGE_KEY, s);
}
