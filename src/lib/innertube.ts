// Server-only: YouTube's internal "innertube" API, which the web player itself uses.
// Unlike watch pages it isn't behind the intermittent "confirm you're not a bot" check.

import { YT_HEADERS, fetchYouTubePage, parseViewerCount } from './youtubeServer';

export interface InnertubeConfig {
  apiKey: string;
  clientVersion: string;
}

const CONFIG_TTL_MS = 6 * 60 * 60_000;
// Any live_chat page carries the web client's key and version; this one is small and never bot-checked
const CONFIG_SOURCE = 'https://www.youtube.com/live_chat?is_popout=1&v=dQw4w9WgXcQ';

let cached: { config: InnertubeConfig; at: number } | null = null;

export function innertubeConfigFromPage(html: string): InnertubeConfig | null {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"clientVersion":"([\d.]+)"/)?.[1];
  return apiKey && clientVersion ? { apiKey, clientVersion } : null;
}

export async function getInnertubeConfig(): Promise<InnertubeConfig> {
  if (cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached.config;
  const config = innertubeConfigFromPage(await fetchYouTubePage(CONFIG_SOURCE, { cache: false }));
  if (!config) throw new Error('Innertube config not found');
  cached = { config, at: Date.now() };
  return config;
}

type Runs = { runs?: { text: string }[]; simpleText?: string };
const textOf = (t: Runs | undefined) => t?.simpleText ?? t?.runs?.map(r => r.text).join('') ?? '';

/** Live status, concurrent viewers and title of a video. */
export async function fetchLiveMetadata(videoId: string): Promise<{ title: string; isLive: boolean; viewers: number | null }> {
  const { apiKey, clientVersion } = await getInnertubeConfig();
  const res = await fetch(`https://www.youtube.com/youtubei/v1/updated_metadata?key=${apiKey}`, {
    method: 'POST',
    headers: { ...YT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion, hl: 'en' } }, videoId }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`updated_metadata responded ${res.status}`);

  let title = '';
  let isLive = false;
  let viewers: number | null = null;
  for (const action of (await res.json()).actions ?? []) {
    const views = action.updateViewershipAction?.viewCount?.videoViewCountRenderer;
    if (views) {
      isLive = views.isLive === true;
      if (isLive) viewers = parseViewerCount(textOf(views.viewCount));
    }
    if (action.updateTitleAction) title = textOf(action.updateTitleAction.title);
  }
  return { title, isLive, viewers };
}
