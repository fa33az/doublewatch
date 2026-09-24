"use client";

import React from 'react';
import type { ChatMessage } from '../lib/youtube';
import type { AppSettings } from '../lib/settings';

interface ChatLineProps {
  msg: ChatMessage;
  settings: AppSettings;
  channel?: { label: string; color: string };
}

/** One chat message in list form (side panel and combined sidebar). */
const ChatLine: React.FC<ChatLineProps> = ({ msg, settings, channel }) => {
  const member = msg.isMember && settings.showMemberBadge;
  const moderator = msg.isModerator && settings.showModBadge;

  return (
    <div
      className={`chat-msg ${member ? 'is-member' : ''} ${moderator ? 'is-mod' : ''} ${msg.superchat ? 'is-superchat' : ''}`}
      style={msg.superchat ? { ['--sc' as string]: msg.superchat.color } : undefined}
    >
      {channel && <span className="ch-tag" style={{ ['--ch' as string]: channel.color }}>{channel.label}</span>}
      {msg.avatar && <img src={msg.avatar} alt="" className="avatar" referrerPolicy="no-referrer" />}
      <div className="chat-msg-body">
        {msg.superchat && <span className="sc-amount">{msg.superchat.amount}</span>}
        {moderator && <span className="tag tag-mod">MOD</span>}
        {member && !moderator && <span className="tag tag-member">MEMBER</span>}
        <span className="chat-author">{msg.author}</span>
        {msg.parts.map((p, i) =>
          'text' in p
            ? <React.Fragment key={i}>{p.text}</React.Fragment>
            : <img key={i} src={p.emoji} alt={p.alt} className="chat-emoji" referrerPolicy="no-referrer" />
        )}
      </div>
    </div>
  );
};

export default ChatLine;
