import { useEffect, useState } from 'react';
import type { VideoMeta } from '../lib/youtube';

const POLL_MS = 60_000;

/** Title, channel, live status and viewers for a video; re-polled every minute while it is live. */
export function useVideoMeta(videoId: string): VideoMeta | null {
  const [meta, setMeta] = useState<VideoMeta | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let last: VideoMeta | null = null;

    const load = async () => {
      // VODs don't change; hidden tabs don't need fresh viewer counts
      if (last?.isLive === false || document.hidden) return;
      try {
        const res = await fetch(`/api/video/${videoId}`, { signal: controller.signal });
        if (!res.ok) return;
        last = await res.json();
        setMeta(last);
      } catch {}
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [videoId]);

  return meta;
}
