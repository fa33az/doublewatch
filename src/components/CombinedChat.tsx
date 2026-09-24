"use client";

import React, { useMemo, useState } from 'react';
import { X, MessagesSquare, MessageSquareOff } from 'lucide-react';
import type { AppSettings } from '../lib/settings';
import type { ChatMessage } from '../lib/youtube';
import { CHANNEL_COLORS, isBlocked, parseBlockedWords } from '../lib/chat';
import { useLiveChat } from '../hooks/useLiveChat';
import { useStickToBottom } from '../hooks/useStickToBottom';
import ChatLine from './ChatLine';

const MAX_MESSAGES = 300;

interface TaggedMessage extends ChatMessage { slot: number }

/** Subscribes to one channel's chat; renders only its error, if any. */
const ChatSource: React.FC<{ videoId: string; slot: number; onMessage: (m: TaggedMessage) => void }> = ({ videoId, slot, onMessage }) => {
  const error = useLiveChat(videoId, msg => onMessage({ ...msg, slot }));
  if (!error) return null;
  return (
    <p className="sidebar-note">
      <MessageSquareOff size={13} /> CH {slot + 1}: {error}
    </p>
  );
};

interface Props {
  videoIds: string[];   // per slot; '' for empty screens
  settings: AppSettings;
  onClose: () => void;
}

/** Sidebar (bottom sheet on phones) merging every screen's live chat, tagged by channel. */
const CombinedChat: React.FC<Props> = ({ videoIds, settings, onClose }) => {
  const [messages, setMessages] = useState<TaggedMessage[]>([]);
  const [listRef, onScroll] = useStickToBottom<HTMLDivElement>(messages);
  const blocked = useMemo(() => parseBlockedWords(settings.chatBlockedWords), [settings.chatBlockedWords]);

  const onMessage = (msg: TaggedMessage) => {
    if (isBlocked(msg, blocked)) return;
    setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), msg]);
  };

  // One source per video: two screens showing the same stream shouldn't double every message
  const active = videoIds
    .map((id, slot) => ({ id, slot }))
    .filter((v, i, all) => v.id && all.findIndex(o => o.id === v.id) === i);

  return (
    <aside className="sidebar" aria-label="Chat gabungan">
      <div className="sidebar-header">
        <span className="sidebar-title"><MessagesSquare size={16} /> Chat gabungan</span>
        <button className="icon-btn" onClick={onClose} aria-label="Tutup chat gabungan"><X size={18} /></button>
      </div>

      <div className="sidebar-notes">
        {active.map(({ id, slot }) => (
          <ChatSource key={`${slot}-${id}`} videoId={id} slot={slot} onMessage={onMessage} />
        ))}
      </div>

      <div className="chat-list" ref={listRef} onScroll={onScroll} role="log">
        {active.length === 0
          ? <p className="chat-empty">Belum ada siaran yang diputar.</p>
          : messages.length === 0
            ? <p className="chat-empty">Menunggu pesan…</p>
            : messages.map(m => (
                <ChatLine
                  key={`${m.slot}-${m.id}`}
                  msg={m}
                  settings={settings}
                  channel={{ label: `CH${m.slot + 1}`, color: CHANNEL_COLORS[m.slot] }}
                />
              ))}
      </div>
    </aside>
  );
};

export default CombinedChat;
