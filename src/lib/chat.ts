import type { ChatMessage } from './youtube';

/** Accent color per channel, used for CH badges in the combined chat and pane toolbars. */
export const CHANNEL_COLORS = ['#37a2ea', '#ea76ae', '#4ebd77', '#c264ee'];

export const parseBlockedWords = (s: string) =>
  s.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

export const messageText = (msg: ChatMessage) =>
  msg.parts.map(p => ('text' in p ? p.text : p.alt)).join('');

export const isBlocked = (msg: ChatMessage, blocked: string[]) => {
  if (blocked.length === 0) return false;
  const text = `${msg.author} ${messageText(msg)}`.toLowerCase();
  return blocked.some(word => text.includes(word));
};
