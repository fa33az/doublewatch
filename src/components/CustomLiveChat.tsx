"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MessageSquareOff } from 'lucide-react';

interface CustomLiveChatProps {
  videoId: string;
}

interface RawMessage {
  id: string;
  authorName: string;
  authorProfileImageUrl: string;
  messageText: string;
  isMember?: boolean;
  isModerator?: boolean;
}

const DURATION = 12; // seconds to cross the screen

const CustomLiveChat: React.FC<CustomLiveChatProps> = ({ videoId }) => {
  const [current, setCurrent] = useState<RawMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Queue of incoming messages waiting to fly
  const queueRef = useRef<RawMessage[]>([]);
  const isPlayingRef = useRef(false);

  const playNext = () => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      setCurrent(null);
      return;
    }
    isPlayingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrent(next);
  };

  const handleAnimationEnd = () => {
    // When current message finishes flying, start the next one
    playNext();
  };

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    const eventSource = new EventSource(`/api/chat/${videoId}`);

    eventSource.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const rawMsg = JSON.parse(event.data);
        
        let text = '';
        if (Array.isArray(rawMsg.message)) {
          text = rawMsg.message.map((m: any) => m.text || '').join('');
        }
        if (!text) return;

        const msg: RawMessage = {
          id: rawMsg.id || Date.now().toString() + Math.random(),
          authorName: rawMsg.author?.name || 'User',
          authorProfileImageUrl: rawMsg.author?.thumbnail?.url || 'https://via.placeholder.com/24',
          messageText: text,
          isMember: rawMsg.author?.isChatSponsor || false,
          isModerator: rawMsg.author?.isChatModerator || false,
        };

        // Cap queue at 10 so it doesn't grow endlessly during heavy chat
        if (queueRef.current.length < 10) {
          queueRef.current.push(msg);
        }

        // If nothing is playing right now, start immediately
        if (!isPlayingRef.current) {
          playNext();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.addEventListener('chat-error', ((e: any) => {
      if (!isMounted) return;
      try { setError(JSON.parse(e.data)); } catch {}
    }) as any);

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [videoId]);

  if (error) {
    return (
      <div className="custom-chat-error">
        <MessageSquareOff size={20} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="custom-chat-container">
      <div className="custom-chat-messages">
        {current && (
          <div 
            key={current.id}
            className={`danmaku-message ${current.isMember ? 'member' : ''} ${current.isModerator ? 'moderator' : ''}`}
            style={{ animationDuration: `${DURATION}s` }}
            onAnimationEnd={handleAnimationEnd}
          >
            <img src={current.authorProfileImageUrl} alt={current.authorName} className="chat-avatar" />
            {current.isModerator && <span className="chat-badge mod-badge">MOD</span>}
            {current.isMember && !current.isModerator && <span className="chat-badge member-badge">MEMBER</span>}
            <span className="chat-text">
              <span className={`chat-author ${current.isMember ? 'member-text' : ''} ${current.isModerator ? 'moderator-text' : ''}`}>
                {current.authorName}
              </span>
              : {current.messageText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomLiveChat;
