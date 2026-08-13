import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      const host = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:5000';

      const newSocket = io(host, {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsReconnecting(false);
        console.log('Socket connection established');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket connection disconnected');
      });

      newSocket.on('reconnect_attempt', () => {
        setIsReconnecting(true);
      });

      newSocket.on('reconnect_failed', () => {
        setIsReconnecting(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      setSocket(null);
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
export default SocketContext;
