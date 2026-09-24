import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '../../../lib/rateLimit';
import type { SearchResult } from '../../../lib/youtube';
import { extractInitialData, fetchYouTubePage, parseViewerCount } from '../../../lib/youtubeServer';

const MAX_QUERY_LENGTH = 100;

const runsText = (runs: { text: string }[] | undefined) => runs?.map(r => r.text).join('') ?? '';

async function searchWithApi(query: string, apiKey: string): Promise<SearchResult[]> {
  // Step 1: Search for live videos
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=20`;
  const searchRes = await fetch(searchUrl, { next: { revalidate: 60 } });
  if (!searchRes.ok) throw new Error(`YouTube API Search failed: ${searchRes.status}`);

  const searchData = await searchRes.json();
  const videoIds = (searchData.items ?? []).map((item: any) => item.id?.videoId).filter(Boolean).join(',');
  if (!videoIds) return [];

  // Step 2: Fetch live details for viewer counts
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoIds}&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl, { next: { revalidate: 60 } });
  if (!detailsRes.ok) throw new Error(`YouTube API Video Details failed: ${detailsRes.status}`);

  const detailsData = await detailsRes.json();
  return (detailsData.items ?? []).map((item: any): SearchResult => {
    const thumbs = item.snippet.thumbnails ?? {};
    const concurrent = item.liveStreamingDetails?.concurrentViewers;
    return {
      videoId: item.id,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnail: thumbs.medium?.url || thumbs.high?.url || thumbs.default?.url || '',
      viewers: concurrent ? Number(concurrent) : null,
    };
  });
}

async function searchWithScraper(query: string): Promise<SearchResult[]> {
  // sp=EgJAAQ== filters YouTube search to "Live" results
  const scrapeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgJAAQ%253D%253D`;
  const json = extractInitialData(await fetchYouTubePage(scrapeUrl));
  if (!json) return [];

  const sections = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];

  const items: SearchResult[] = [];
  for (const section of sections) {
    for (const item of section.itemSectionRenderer?.contents ?? []) {
      const vr = item.videoRenderer;
      if (!vr) continue;

      const isLive = vr.badges?.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW')
        || vr.thumbnailOverlays?.some((o: any) => o.thumbnailOverlayTimeStatusRenderer?.style === 'LIVE');
      if (!isLive) continue;

      items.push({
        videoId: vr.videoId,
        title: vr.title?.runs?.[0]?.text || '',
        channelName: vr.ownerText?.runs?.[0]?.text || '',
        thumbnail: vr.thumbnail?.thumbnails?.[0]?.url || '',
        // viewCountText has the full number; shortViewCountText is abbreviated ("1.5K")
        viewers: parseViewerCount(runsText(vr.viewCountText?.runs) || vr.viewCountText?.simpleText),
      });
    }
  }
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim().slice(0, MAX_QUERY_LENGTH);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }
  if (!rateLimit(`search:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak pencarian. Tunggu sebentar lalu coba lagi.' }, { status: 429 });
  }

  // 1. Official YouTube Data API v3 when a key is configured
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      return NextResponse.json(await searchWithApi(query, apiKey));
    } catch (e) {
      // Quota limits, expired key, etc. — fall through to the scraper
      console.warn('Official YouTube API failed, falling back to scrape-based search:', (e as Error).message);
    }
  }

  // 2. Scrape-based fallback (no API key required)
  try {
    return NextResponse.json(await searchWithScraper(query));
  } catch (e) {
    console.error('YouTube Search API error:', e);
    return NextResponse.json({ error: 'Gagal mengambil hasil pencarian dari YouTube.' }, { status: 502 });
  }
}
