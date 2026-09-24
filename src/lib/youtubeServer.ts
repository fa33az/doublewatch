// Server-only helpers for reading YouTube's public web pages (used when no API key is set).

export const YT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** YouTube sometimes answers server requests with a "confirm you're not a bot" page. */
export const isBotCheck = (html: string) => html.includes('"status":"LOGIN_REQUIRED"');

/**
 * Fetches a youtube.com page as HTML. `cache` uses Next's 60s fetch cache (fine for search
 * pages). Watch / channel pages pass `retries` instead and skip the cache, so an intermittent
 * bot-check page is retried rather than cached; callers must still handle `isBotCheck(html)`.
 */
export async function fetchYouTubePage(url: string, { cache = true, retries = 0 } = {}): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: YT_HEADERS, ...(cache ? { next: { revalidate: 60 } } : { cache: 'no-store' as const }) });
    if (!res.ok) throw new Error(`YouTube responded ${res.status}`);
    const html = await res.text();
    if (!isBotCheck(html) || attempt >= retries) return html;
  }
}

/** Parses the page's `ytInitialData` JSON, or null if it's missing. */
export function extractInitialData(html: string): any {
  // Anchor on the closing </script> so a "};" inside a JSON string can't end the match early
  const match = html.match(/ytInitialData"?\]?\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** Title and channel via oEmbed, which isn't subject to the bot check. */
export async function fetchOEmbed(videoId: string): Promise<{ title: string; author: string } | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return { title: data.title ?? '', author: data.author_name ?? '' };
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };

/** Decodes the few HTML entities YouTube uses in <meta content="..."> attributes. */
export const decodeHtml = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e: string) => ENTITIES[e]);

/** Reads a JSON string value like "author":"..." out of the page's inline JSON. */
export function jsonStringField(html: string, field: string): string | null {
  const match = html.match(new RegExp(`"${field}":("(?:[^"\\\\]|\\\\.)*")`));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

export const metaContent = (html: string, attr: 'name' | 'property', key: string) => {
  const match = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return match ? decodeHtml(match[1]) : null;
};

export const isLiveNow = (html: string) => html.includes('"isLiveNow":true');

/** Pulls the first integer out of text like "1,573 watching" or "1.573 menonton". */
export const parseViewerCount = (text: string | null | undefined): number | null => {
  if (!text) return null;
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
};
