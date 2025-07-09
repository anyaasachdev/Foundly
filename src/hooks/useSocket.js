import { useEffect, useRef } from 'react';
import ApiService from '../services/api';

export const useSocket = (token, organizationId) => {
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  useEffect(() => {
    if (token && organizationId) {
      console.log('Connecting to socket endpoint');
      
      // Create a socket-like object that uses HTTP polling
      const socket = {
        connected: false,
        sessionId: null,
        
        async connect() {
          try {
            const response = await ApiService.request('/socket?action=connect', {
              method: 'POST',
              body: JSON.stringify({ token, organizationId })
            });
            
            this.sessionId = response.sessionId;
            this.connected = true;
            sessionIdRef.current = response.sessionId;
            console.log('Connected to socket endpoint');
            return true;
          } catch (error) {
            console.error('Socket connection error:', error);
            return false;
          }
        },
        
        async disconnect() {
          if (this.sessionId) {
            try {
              await ApiService.request('/socket?action=disconnect', {
                method: 'POST',
                body: JSON.stringify({ sessionId: this.sessionId })
              });
            } catch (error) {
              console.error('Socket disconnect error:', error);
            }
          }
          this.connected = false;
          this.sessionId = null;
          sessionIdRef.current = null;
          console.log('Disconnected from socket endpoint');
        },
        
        async emit(event, data, room = null) {
          if (!this.sessionId) return;
          
          try {
            await ApiService.request('/socket?action=emit', {
              method: 'POST',
              body: JSON.stringify({
                sessionId: this.sessionId,
                event,
                data,
                room: room || organizationId
              })
            });
          } catch (error) {
            console.error('Socket emit error:', error);
          }
        },
        
        async listen(callback, room = null) {
          if (!this.sessionId) return;
          
          try {
            const data = await ApiService.request('/socket?action=listen', {
              method: 'POST',
              body: JSON.stringify({
                sessionId: this.sessionId,
                room: room || organizationId
              })
            });
            
            if (data.events && data.events.length > 0) {
              data.events.forEach(eventData => {
                callback(eventData.event, eventData.data);
              });
            }
          } catch (error) {
            console.error('Socket listen error:', error);
          }
        },
        
        on(event, callback) {
          // Store callback for polling
          this[`_${event}Callback`] = callback;
        }
      };
      
      // Connect to socket endpoint
      socket.connect().then(() => {
        socketRef.current = socket;
        
        // Start polling for events
        pollingIntervalRef.current = setInterval(() => {
          if (socket.connected) {
            socket.listen((event, data) => {
              const callback = socket[`_${event}Callback`];
              if (callback) {
                callback(data);
              }
            });
          }
        }, 2000); // Poll every 2 seconds
      });
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [token, organizationId]);
  
  return socketRef.current;
};