import { useEffect, useRef, useState, useCallback } from 'react';
import { type Message } from '@shared/schema';

interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useWebSocket({ roomId, userId, onMessage, onError }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Join the room
        ws.send(JSON.stringify({
          type: 'join',
          userId,
          roomId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && onMessage) {
            onMessage(data.message);
          } else if (data.type === 'error') {
            setError(data.error);
            onError?.(data.error);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        const errorMsg = 'WebSocket 연결 오류';
        setError(errorMsg);
        onError?.(errorMsg);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        
        // Only update state and attempt reconnection if component is still mounted
        if (!isMountedRef.current) return;
        
        setIsConnected(false);
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else {
          const errorMsg = '연결 재시도 실패. 페이지를 새로고침해주세요.';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setError('WebSocket 연결 실패');
    }
  }, [roomId, userId, onMessage, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        roomId,
        senderId: userId,
        content,
      }));
      return true;
    } else {
      console.error('WebSocket is not connected');
      setError('메시지를 전송할 수 없습니다. 연결을 확인해주세요.');
      return false;
    }
  }, [roomId, userId]);

  return { isConnected, sendMessage, error };
}
