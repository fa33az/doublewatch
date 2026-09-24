import { useEffect, useRef, useState } from 'react';
import { subscribeChat } from '../lib/chatHub';
import type { ChatMessage } from '../lib/youtube';

/** Calls `onMessage` for each live chat message of `videoId`; returns the connection error, if any. */
export function useLiveChat(videoId: string | null, onMessage: (msg: ChatMessage) => void): string | null {
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef(onMessage);
  useEffect(() => { handlerRef.current = onMessage; });

  useEffect(() => {
    if (!videoId) return;
    return subscribeChat(videoId, msg => handlerRef.current(msg), setError);
  }, [videoId]);

  return error;
}
