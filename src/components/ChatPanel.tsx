"use client";

import React, { useMemo, useState } from 'react';
import { MessageSquareOff } from 'lucide-react';
import type { AppSettings } from '../lib/settings';
import type { ChatMessage } from '../lib/youtube';
import { isBlocked, parseBlockedWords } from '../lib/chat';
import { useLiveChat } from '../hooks/useLiveChat';
import { useStickToBottom } from '../hooks/useStickToBottom';
import ChatLine from './ChatLine';

const MAX_MESSAGES = 200;

/** Classic scrolling chat list beside (or, in narrow screens, under) the video. */
const ChatPanel: React.FC<{ videoId: string; settings: AppSettings }> = ({ videoId, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listRef, onScroll] = useStickToBottom<HTMLDivElement>(messages);
  const blocked = useMemo(() => parseBlockedWords(settings.chatBlockedWords), [settings.chatBlockedWords]);

  const error = useLiveChat(videoId, (msg) => {
    if (isBlocked(msg, blocked)) return;
    setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), msg]);
  });

  return (
    <div className="chat-list" ref={listRef} onScroll={onScroll} role="log">
      {error
        ? <p className="chat-empty"><MessageSquareOff size={15} /> {error}</p>
        : messages.length === 0
          ? <p className="chat-empty">Menunggu pesan…</p>
          : messages.map(m => <ChatLine key={m.id} msg={m} settings={settings} />)}
    </div>
  );
};

export default ChatPanel;
