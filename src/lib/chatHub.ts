import type { ChatMessage } from './youtube';

// One EventSource per video, shared by every chat view (side panel, combined sidebar).

type MessageListener = (msg: ChatMessage) => void;
type ErrorListener = (error: string) => void;

interface Connection {
  source: EventSource;
  messageListeners: Set<MessageListener>;
  errorListeners: Set<ErrorListener>;
  seen: Set<string>;
  seenOrder: string[];
  error: string | null;
}

const SEEN_LIMIT = 500;
const connections = new Map<string, Connection>();

function open(videoId: string): Connection {
  const conn: Connection = {
    source: new EventSource(`/api/chat/${videoId}`),
    messageListeners: new Set(),
    errorListeners: new Set(),
    seen: new Set(),
    seenOrder: [],
    error: null,
  };

  conn.source.onmessage = (event) => {
    let msg: ChatMessage;
    try { msg = JSON.parse(event.data); } catch { return; }
    // Serverless hosts end long-lived functions; EventSource then reconnects and the
    // server replays recent messages, so drop ones we've already delivered
    if (conn.seen.has(msg.id)) return;
    conn.seen.add(msg.id);
    conn.seenOrder.push(msg.id);
    if (conn.seenOrder.length > SEEN_LIMIT) conn.seen.delete(conn.seenOrder.shift()!);
    conn.messageListeners.forEach(listener => listener(msg));
  };

  // Sent by the server before it gives up; closing stops EventSource's auto-reconnect
  conn.source.addEventListener('chat-error', (event) => {
    conn.source.close();
    try { conn.error = JSON.parse((event as MessageEvent).data); } catch { conn.error = 'Live chat tidak tersedia.'; }
    conn.errorListeners.forEach(listener => listener(conn.error!));
  });

  connections.set(videoId, conn);
  return conn;
}

/** Subscribes to a video's live chat. Returns an unsubscribe function. */
export function subscribeChat(videoId: string, onMessage: MessageListener, onError: ErrorListener): () => void {
  const conn = connections.get(videoId) ?? open(videoId);
  conn.messageListeners.add(onMessage);
  conn.errorListeners.add(onError);
  if (conn.error) onError(conn.error);

  return () => {
    conn.messageListeners.delete(onMessage);
    conn.errorListeners.delete(onError);
    // Last listener gone: close, so the next subscriber gets a fresh attempt
    if (conn.messageListeners.size === 0) {
      conn.source.close();
      connections.delete(videoId);
    }
  };
}
