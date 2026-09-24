import { MAX_CHANNELS } from './mixer';
import { extractVideoId, isValidVideoId } from './youtube';

export interface Channel { url: string; id: string }

export const emptyChannel = (): Channel => ({ url: '', id: '' });
export const emptyChannels = (): Channel[] => Array.from({ length: MAX_CHANNELS }, emptyChannel);
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const persistChannel = (idx: number, ch: Channel) => {
  try {
    localStorage.setItem(`v${idx + 1}url`, ch.url);
    localStorage.setItem(`v${idx + 1}id`, ch.id);
  } catch {}
};

export const loadChannels = (): Channel[] =>
  Array.from({ length: MAX_CHANNELS }, (_, i) => {
    let url = '';
    let storedId = '';
    try {
      url = localStorage.getItem(`v${i + 1}url`) || '';
      storedId = localStorage.getItem(`v${i + 1}id`) || '';
    } catch {}
    // Re-derive the ID so links saved before /live/ and /shorts/ support start working
    const id = extractVideoId(url) || (isValidVideoId(storedId) ? storedId : '');
    return { url, id };
  });

/** Channels from a shared link (?v=id1,id2,...), or null if the URL has none. */
export const channelsFromShareLink = (search: string): Channel[] | null => {
  const param = new URLSearchParams(search).get('v');
  if (param === null) return null;
  const ids = param.split(',').slice(0, MAX_CHANNELS).map(extractVideoId);
  if (!ids.some(Boolean)) return null;
  return ids.map(id => ({ url: id ? watchUrl(id) : '', id }));
};

export const shareUrl = (ids: string[]) =>
  `${window.location.origin}${window.location.pathname}?v=${ids.join(',')}`;
