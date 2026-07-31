import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';

interface WebSocketMessage {
  type: string;
  userId?: number;
  isOnline?: boolean;
  timestamp?: number;
}

export function useWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [memberUpdates, setMemberUpdates] = useState<Map<number, boolean>>(new Map());
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounting = useRef(false);

  useEffect(() => {
    if (!user) return;
    isUnmounting.current = false;

    const connect = () => {
      if (isUnmounting.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0; // reset backoff on clean connect
        socket.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          if (data.type === 'member_status_update' && data.userId && data.isOnline !== undefined) {
            setMemberUpdates(prev => new Map(prev.set(data.userId!, data.isOnline!)));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (!isUnmounting.current) {
          // Exponential backoff reconnect: 1s, 2s, 4s, 8s... capped at 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'heartbeat'
        }));
      }
    }, 30000);

    return () => {
      isUnmounting.current = true;
      clearInterval(heartbeat);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [user]);

  return { isConnected, memberUpdates };
}