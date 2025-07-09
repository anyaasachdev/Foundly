import { useEffect, useRef } from 'react';

export const useSocket = (token, organizationId) => {
  const socketRef = useRef(null);
  
  useEffect(() => {
    // Temporarily disable socket functionality to prevent errors
    console.log('Socket functionality temporarily disabled');
    
    // Create a mock socket object that has all required methods
    const mockSocket = {
      connected: false,
      on: () => {},
      off: () => {},
      emit: () => {},
      disconnect: () => {},
      connect: () => {}
    };
    
    socketRef.current = mockSocket;
    
    return () => {
      // Cleanup
    };
  }, [token, organizationId]);
  
  return socketRef.current;
};