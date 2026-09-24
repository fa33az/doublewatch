import { NextResponse } from 'next/server';
import { isValidHandle, type ChannelStatus } from '../../../lib/youtube';
import { clientIp, rateLimit } from '../../../lib/rateLimit';
import { fetchYouTubePage, isBotCheck, isLiveNow, jsonStringField, metaContent } from '../../../lib/youtubeServer';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

/** Resolves a channel (@handle or UC… ID) to its current live stream, if any. */
export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get('handle')?.trim() ?? '';

  if (!isValidHandle(handle)) {
    return NextResponse.json({ error: 'Handle tidak valid' }, { status: 400 });
  }
  if (!rateLimit(`resolve:${clientIp(request)}`, 40, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' }, { status: 429 });
  }

  const path = handle.startsWith('@') ? handle : `channel/${handle}`;
  try {
    const html = await fetchYouTubePage(`https://www.youtube.com/${path}/live`, { cache: false, retries: 2 });
    if (isBotCheck(html)) {
      return NextResponse.json({ error: 'YouTube sedang membatasi permintaan. Coba lagi sebentar.' }, { status: 503 });
    }
    // A live channel's /live page canonicalizes to the stream; otherwise to the channel page
    const videoId = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1];
    const live = Boolean(videoId) && isLiveNow(html);

    const status: ChannelStatus = live
      ? {
          handle,
          name: jsonStringField(html, 'ownerChannelName') ?? handle,
          live: true,
          videoId,
          title: metaContent(html, 'property', 'og:title') ?? undefined,
        }
      : { handle, name: metaContent(html, 'property', 'og:title') ?? handle, live: false };

    return NextResponse.json(status, { headers: CACHE_HEADERS });
  } catch (e) {
    // YouTube answers 404 for handles that don't exist
    const notFound = (e as Error).message.includes('404');
    if (!notFound) console.error('Resolve error:', e);
    return NextResponse.json(
      { error: notFound ? 'Channel tidak ditemukan' : 'Gagal memeriksa channel.' },
      { status: notFound ? 404 : 502 },
    );
  }
}
