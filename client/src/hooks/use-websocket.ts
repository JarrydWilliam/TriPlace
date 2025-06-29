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

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Authenticate with user ID
      ws.current?.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.type === 'member_status_update' && data.userId && data.isOnline !== undefined) {
          setMemberUpdates(prev => new Map(prev.set(data.userId!, data.isOnline!)));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'heartbeat'
        }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      ws.current?.close();
    };
  }, [user]);

  return { isConnected, memberUpdates };
}