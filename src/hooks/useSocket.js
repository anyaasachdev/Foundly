import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = (token, organizationId) => {
  const socketRef = useRef(null);
  
  useEffect(() => {
    // Temporarily disable socket connections to avoid connection refused errors
    // TODO: Set up proper socket server or use WebSocket service
    console.log('Socket connections temporarily disabled');
    
    // if (token && organizationId) {
    //   socketRef.current = io('http://localhost:3001', { // Changed from 5000 to 3001
    //     auth: {
    //       token: token
    //     }
    //   });
    //   
    //   socketRef.current.on('connect', () => {
    //     console.log('Connected to server');
    //   });
    //   
    //   socketRef.current.on('disconnect', () => {
    //     console.log('Disconnected from server');
    //   });
    //   
    //   return () => {
    //     socketRef.current.disconnect();
    //   };
    // }
  }, [token, organizationId]);
  
  return socketRef.current;
};