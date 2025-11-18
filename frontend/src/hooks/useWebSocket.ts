import { useEffect, useState } from "react";
import { createWS, ScoreUpdate } from "../services/ws";

export type WebSocketStatus = "connecting" | "open" | "closed";

// Shared WebSocket instance and subscriber lists for the whole app
let sharedSocket: WebSocket | null = null;
let sharedStatus: WebSocketStatus = "connecting";
let messageSubscribers: Array<(data: ScoreUpdate) => void> = [];
let statusSubscribers: Array<(s: WebSocketStatus) => void> = [];

function ensureSocket() {
  if (sharedSocket && sharedSocket.readyState !== WebSocket.CLOSED) {
    return sharedSocket;
  }

  const ws = createWS();
  sharedSocket = ws;
  sharedStatus = "connecting";

  const broadcastStatus = (s: WebSocketStatus) => {
    sharedStatus = s;
    statusSubscribers.forEach((fn) => fn(s));
  };

  ws.onopen = () => {
    broadcastStatus("open");
  };

  ws.onclose = () => {
    broadcastStatus("closed");
  };

  ws.onerror = () => {
    broadcastStatus("closed");
  };

  ws.onmessage = (ev) => {
    try {
      const data: ScoreUpdate = JSON.parse(ev.data);
      messageSubscribers.forEach((fn) => fn(data));
    } catch (err) {
      console.error("Failed to parse WebSocket message", err);
    }
  };

  return ws;
}

export function closeSharedWebSocket() {
  if (sharedSocket) {
    try {
      if (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING) {
        sharedSocket.close();
      }
    } catch {
      // ignore close errors
    }
  }
  sharedSocket = null;
  sharedStatus = "closed";
  messageSubscribers = [];
  statusSubscribers.forEach((fn) => fn("closed"));
  statusSubscribers = [];
}

export function useWebSocket(onMessage: (data: ScoreUpdate) => void) {
  const [status, setStatus] = useState<WebSocketStatus>(sharedStatus);

  useEffect(() => {
    // Register this hook instance as a subscriber
    messageSubscribers.push(onMessage);
    statusSubscribers.push(setStatus);

    // Ensure a single shared socket exists
    ensureSocket();

    return () => {
      // Unsubscribe on unmount, but DO NOT close the socket
      messageSubscribers = messageSubscribers.filter((fn) => fn !== onMessage);
      statusSubscribers = statusSubscribers.filter((fn) => fn !== setStatus);
    };
  }, [onMessage]);

  return { status, socket: sharedSocket };
}
