import { NextResponse } from 'next/server';
import { fetchChat } from 'youtube-chat/dist/requests';
import { parseChatData } from 'youtube-chat/dist/parser';
import type { ChatItem } from 'youtube-chat/dist/types/data';
import type { FetchOptions, GetLiveChatResponse } from 'youtube-chat/dist/types/yt-response';
import { isValidVideoId, type ChatMessage } from '../../../../lib/youtube';
import { clientIp, rateLimit } from '../../../../lib/rateLimit';
import { extractInitialData, fetchYouTubePage, isBotCheck } from '../../../../lib/youtubeServer';
import { innertubeConfigFromPage } from '../../../../lib/innertube';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Vercel ends the function at this limit; the client's EventSource reconnects and chatHub dedupes
export const maxDuration = 300;

const POLL_MS = 1000;
const HEARTBEAT_MS = 15_000;
const MAX_CONSECUTIVE_ERRORS = 10;
const BACKLOG = 30; // recent messages sent on connect, so a quiet chat doesn't start empty

const toChatMessage = (item: ChatItem): ChatMessage => ({
  id: item.id,
  author: item.author.name,
  avatar: item.author.thumbnail?.url ?? '',
  parts: item.message.map(m =>
    'text' in m ? { text: m.text }
    : m.isCustomEmoji ? { emoji: m.url, alt: m.emojiText }
    : { text: m.emojiText }
  ),
  isMember: item.isMembership,
  isModerator: item.isModerator || item.isOwner,
  ...(item.superchat && { superchat: { amount: item.superchat.amount, color: item.superchat.color } }),
});

/**
 * Reads recent messages and the continuation token from YouTube's live_chat popout page —
 * much lighter than the watch page and not behind its intermittent bot check — then polls
 * with youtube-chat's chat endpoint client and parser.
 */
async function loadChat(videoId: string): Promise<{ options: FetchOptions; backlog: ChatItem[] }> {
  const html = await fetchYouTubePage(`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`, { cache: false, retries: 2 });
  if (isBotCheck(html)) throw new Error('bot-check');
  const config = innertubeConfigFromPage(html);
  // Pages for videos without a live chat (VODs, ended streams) have no chat renderer
  const renderer = extractInitialData(html)?.contents?.liveChatRenderer;
  if (!config || !renderer?.continuations) throw new Error('no-chat');
  // The page embeds the same shape the chat endpoint returns, so the same parser applies
  const [backlog, continuation] = parseChatData({ continuationContents: { liveChatContinuation: renderer } } as unknown as GetLiveChatResponse);
  if (!continuation) throw new Error('no-chat');
  return { options: { ...config, continuation }, backlog: backlog.slice(-BACKLOG) };
}

const startErrorMessage = (err: unknown) =>
  (err as Error)?.message === 'bot-check'
    ? 'YouTube sedang membatasi permintaan. Coba nyalakan chat lagi sebentar.'
    : 'Live chat tidak tersedia untuk video ini.';

export async function GET(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;

  if (!isValidVideoId(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }
  if (!rateLimit(`chat:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { cleanup(); }
      };
      // The client closes its EventSource on this event, so it won't auto-reconnect
      const sendError = (message: string) => send(`event: chat-error\ndata: ${JSON.stringify(message)}\n\n`);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(pollTimer);
        try { controller.close(); } catch {}
      };

      request.signal.addEventListener('abort', cleanup);
      heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS);

      (async () => {
        let options: FetchOptions;
        try {
          const chat = await loadChat(videoId);
          options = chat.options;
          for (const item of chat.backlog) send(`data: ${JSON.stringify(toChatMessage(item))}\n\n`);
        } catch (err) {
          sendError(startErrorMessage(err));
          cleanup();
          return;
        }

        // Chained timeouts (not setInterval) so a slow response never overlaps the next poll
        let consecutiveErrors = 0;
        const poll = async () => {
          if (closed) return;
          try {
            const [items, continuation] = await fetchChat(options);
            options.continuation = continuation;
            consecutiveErrors = 0;
            for (const item of items) send(`data: ${JSON.stringify(toChatMessage(item))}\n\n`);
          } catch (err) {
            // Polling errors are often transient; only give up after several in a row
            if (++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              console.warn(`Live chat for ${videoId} failed repeatedly:`, (err as Error).message);
              sendError('Koneksi live chat terputus.');
              cleanup();
              return;
            }
          }
          if (!closed) pollTimer = setTimeout(poll, POLL_MS);
        };
        poll();
      })();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
