import { NextResponse } from 'next/server';
import { isValidVideoId, type VideoMeta } from '../../../../lib/youtube';
import { clientIp, rateLimit } from '../../../../lib/rateLimit';
import { fetchLiveMetadata } from '../../../../lib/innertube';
import {
  fetchOEmbed, fetchYouTubePage, isBotCheck, isLiveNow, jsonStringField, metaContent, parseViewerCount,
} from '../../../../lib/youtubeServer';

// Let Vercel's CDN absorb repeat polls from every viewer of the same stream
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

async function metaFromApi(videoId: string, apiKey: string): Promise<VideoMeta | null> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`YouTube API failed: ${res.status}`);
  const item = (await res.json()).items?.[0];
  if (!item) return null;
  const concurrent = item.liveStreamingDetails?.concurrentViewers;
  return {
    title: item.snippet.title,
    author: item.snippet.channelTitle,
    isLive: item.snippet.liveBroadcastContent === 'live',
    viewers: concurrent ? Number(concurrent) : null,
  };
}

/** oEmbed for title/channel + innertube for live status and viewers; neither is bot-checked. */
async function metaFromInnertube(videoId: string): Promise<VideoMeta | null> {
  const [oembed, live] = await Promise.all([fetchOEmbed(videoId), fetchLiveMetadata(videoId)]);
  if (!oembed && !live.title) return null;
  return { title: oembed?.title || live.title, author: oembed?.author ?? '', isLive: live.isLive, viewers: live.viewers };
}

async function metaFromPage(videoId: string): Promise<VideoMeta | null> {
  const html = await fetchYouTubePage(`https://www.youtube.com/watch?v=${videoId}`, { cache: false, retries: 2 });
  if (isBotCheck(html)) {
    // Still blocked: title from oEmbed, live status unknown (never report a live stream as ended)
    const oembed = await fetchOEmbed(videoId);
    return oembed && { ...oembed, isLive: null, viewers: null };
  }
  const title = metaContent(html, 'name', 'title');
  if (!title) return null;
  const live = isLiveNow(html);
  const viewerRuns = html.match(/"videoViewCountRenderer":\{"viewCount":\{"runs":\[\{"text":"([^"]+)"/);
  return {
    title,
    author: jsonStringField(html, 'author') ?? '',
    isLive: live,
    viewers: live ? parseViewerCount(viewerRuns?.[1]) : null,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;

  if (!isValidVideoId(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }
  if (!rateLimit(`video:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  try {
    let meta: VideoMeta | null = null;
    if (apiKey) {
      try { meta = await metaFromApi(videoId, apiKey); }
      catch (e) { console.warn('YouTube API video lookup failed, falling back to page:', (e as Error).message); }
    }
    if (!meta) {
      try { meta = await metaFromInnertube(videoId); }
      catch (e) { console.warn('Innertube video lookup failed, falling back to page:', (e as Error).message); }
    }
    meta ??= await metaFromPage(videoId);
    if (!meta) return NextResponse.json({ error: 'Video tidak ditemukan' }, { status: 404 });
    // Don't let the CDN hold on to an answer with unknown live status
    return NextResponse.json(meta, { headers: meta.isLive === null ? { 'Cache-Control': 'no-store' } : CACHE_HEADERS });
  } catch (e) {
    console.error('Video meta error:', e);
    return NextResponse.json({ error: 'Gagal mengambil info video.' }, { status: 502 });
  }
}
