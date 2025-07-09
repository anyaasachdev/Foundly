const { Server } = require('socket.io');

// In-memory storage for socket connections (not ideal for production but works for Vercel)
const connectedUsers = new Map();
const rooms = new Map();

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Socket endpoint called:', req.method, req.url);
    
    // Handle socket.io polling requests
    if (req.url.includes('socket.io')) {
      // This is a socket.io request
      const action = req.query.action || req.body?.action;
      
      if (action === 'connect') {
        const { token, organizationId } = req.body || {};
        
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
        
        // Generate a session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store user connection
        connectedUsers.set(sessionId, {
          token,
          organizationId,
          connectedAt: new Date(),
          lastSeen: new Date()
        });
        
        return res.status(200).json({
          success: true,
          sessionId,
          message: 'Connected to socket server'
        });
      }
      
      if (action === 'disconnect') {
        const { sessionId } = req.body || {};
        
        if (sessionId && connectedUsers.has(sessionId)) {
          connectedUsers.delete(sessionId);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Disconnected from socket server'
        });
      }
      
      if (action === 'emit') {
        const { sessionId, event, data, room } = req.body || {};
        
        if (!sessionId || !event) {
          return res.status(400).json({ error: 'Session ID and event required' });
        }
        
        // Store the event to be picked up by other clients
        if (room) {
          if (!rooms.has(room)) {
            rooms.set(room, []);
          }
          rooms.get(room).push({
            event,
            data,
            timestamp: new Date(),
            from: sessionId
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Event emitted'
        });
      }
      
      if (action === 'listen') {
        const { sessionId, room } = req.body || {};
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID required' });
        }
        
        // Get events for the room
        const roomEvents = room ? rooms.get(room) || [] : [];
        
        // Update last seen
        if (connectedUsers.has(sessionId)) {
          connectedUsers.get(sessionId).lastSeen = new Date();
        }
        
        return res.status(200).json({
          success: true,
          events: roomEvents,
          connectedUsers: connectedUsers.size
        });
      }
      
      // Default socket.io response
      return res.status(200).json({
        success: true,
        message: 'Socket.io endpoint ready',
        availableActions: ['connect', 'disconnect', 'emit', 'listen']
      });
    }
    
    // Handle regular HTTP requests
    return res.status(200).json({
      success: true,
      message: 'Socket endpoint accessible',
      method: req.method,
      connectedUsers: connectedUsers.size,
      rooms: Array.from(rooms.keys())
    });
    
  } catch (error) {
    console.error('Socket endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
}; 