import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface IWebSocketContext {
  webSocket: WebSocket | null;
  appToken: string | null;
  setAppToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const WebSocketContext = createContext<IWebSocketContext>({
  webSocket: null,
  appToken: null,
  setAppToken: function (): void {
    throw new Error("Function not implemented.");
  },
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

  const [appToken, setAppToken] = useState<string | null>(null);

  // Establish WebSocket connection

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL;

    if (!socketUrl) {
      console.error("WebSocket URL is not defined or invalid.");
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        setWebSocket(ws);
        console.log("WebSocket connected.");
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      ws.onerror = (e) => console.error("WebSocket error:", e);

      ws.onclose = () => {
        console.log("WebSocket closed. Attempting to reconnect...");
        reconnectTimeout = setTimeout(connectWebSocket, 5000); // Retry after 5 seconds
      };
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return <WebSocketContext.Provider value={{ webSocket, appToken, setAppToken }}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => useContext(WebSocketContext);
