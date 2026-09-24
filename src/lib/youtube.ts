const VIDEO_ID_RE = /^[\w-]{11}$/;

// Matches youtu.be/ID, ?v=ID / &v=ID, and /embed|v|live|shorts/ID on any YouTube host
const URL_ID_RE = /(?:youtu\.be\/|[?&]v=|\/(?:embed|v|live|shorts)\/)([\w-]{11})(?![\w-])/;

// @handle (bare or in a youtube.com URL) and /channel/UC... channel IDs
const HANDLE_RE = /^@[\w.-]{3,30}$/;
const URL_HANDLE_RE = /youtube\.com\/(@[\w.-]{3,30})(?:[/?#]|$)/;
const CHANNEL_ID_RE = /(?:^|youtube\.com\/channel\/)(UC[\w-]{22})(?:[/?#]|$)/;

export const isValidVideoId = (id: string) => VIDEO_ID_RE.test(id);

/** Returns the 11-char video ID from a YouTube URL or bare ID, or '' if none is found. */
export const extractVideoId = (input: string): string => {
  const s = input.trim();
  if (!s) return '';
  if (isValidVideoId(s)) return s;
  const match = s.match(URL_ID_RE);
  return match ? match[1] : '';
};

/** Returns '@handle' or a 'UC…' channel ID from user input, or '' if it isn't a channel reference. */
export const extractHandle = (input: string): string => {
  const s = input.trim();
  if (HANDLE_RE.test(s)) return s;
  return s.match(URL_HANDLE_RE)?.[1] ?? s.match(CHANNEL_ID_RE)?.[1] ?? '';
};

export const isValidHandle = (handle: string) => HANDLE_RE.test(handle) || /^UC[\w-]{22}$/.test(handle);

export const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/** A live chat message as streamed by /api/chat/[videoId]. */
export type ChatPart = { text: string } | { emoji: string; alt: string };

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  parts: ChatPart[];
  isMember: boolean;
  isModerator: boolean;
  superchat?: { amount: string; color: string };
}

/** A live stream as returned by /api/search. */
export interface SearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  viewers: number | null;
}

/** Video details as returned by /api/video/[videoId]. */
export interface VideoMeta {
  title: string;
  author: string;
  isLive: boolean | null;   // null = unknown (YouTube blocked the lookup)
  viewers: number | null;
}

/** A channel's current live status as returned by /api/resolve. */
export interface ChannelStatus {
  handle: string;
  name: string;
  live: boolean;
  videoId?: string;
  title?: string;
}

/** Compact Indonesian count: 845, 1.6rb, 2jt. */
export const formatCount = (n: number) => {
  const compact = (v: number, unit: string) => `${v.toFixed(1).replace(/\.0$/, '')}${unit}`;
  if (n >= 999_950) return compact(n / 1_000_000, 'jt'); // 999,950+ would round up to "1000rb"
  if (n >= 1_000) return compact(n / 1_000, 'rb');
  return String(n);
};
