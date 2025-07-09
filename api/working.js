const mongoose = require('mongoose');

let isConnected = false;

// In-memory storage for socket connections (not ideal for production but works for Vercel)
const connectedUsers = new Map();
const rooms = new Map();

// Model definitions - only create if they don't exist
const getModel = (modelName, schema) => {
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }
  return mongoose.model(modelName, schema);
};

const connectDB = async () => {
  try {
    if (isConnected) return;
    
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
    isConnected = false;
    throw error;
  }
};

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
    console.log('Working endpoint called:', req.method, req.url);
    console.log('Request body:', req.body);
    console.log('Request query:', req.query);
    
    await connectDB();
    
    const action = req.query.action || req.body.action || 'test';
    console.log('Action:', action);

    if (action === 'create-announcement' && req.method === 'POST') {
      const { title, content, organizationId } = req.body;
      
      console.log('Creating announcement with:', { title, content, organizationId });
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      try {
        const Announcement = getModel('Announcement', new mongoose.Schema({
          title: String,
          content: String,
          organizationId: String,
          createdAt: { type: Date, default: Date.now }
        }));
        
        const announcement = new Announcement({
          title,
          content,
          organizationId: organizationId || 'default'
        });

        await announcement.save();
        console.log('Announcement saved successfully:', announcement._id);

        return res.status(201).json({ 
          success: true,
          message: 'Announcement created successfully',
          announcement: {
            _id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            createdAt: announcement.createdAt
          }
        });
      } catch (dbError) {
        console.error('Database error creating announcement:', dbError);
        return res.status(500).json({ 
          error: 'Database error', 
          details: dbError.message 
        });
      }
    }
    
    if (action === 'get-announcements' && req.method === 'GET') {
      const Announcement = getModel('Announcement', new mongoose.Schema({
        title: String,
        content: String,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const announcements = await Announcement.find({ 
        organizationId: req.query.organizationId || 'default'
      }).sort({ createdAt: -1 });

      return res.status(200).json({ 
        success: true, 
        announcements: announcements
      });
    }
    
    if (action === 'log-hours' && req.method === 'POST') {
      const { hours, description, date, organizationId } = req.body;
      
      if (!hours || !date) {
        return res.status(400).json({ error: 'Hours and date are required' });
      }
      
      const HourLog = getModel('HourLog', new mongoose.Schema({
        hours: Number,
        description: String,
        date: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const hourLog = new HourLog({
        hours: parseFloat(hours),
        description: description || '',
        date: new Date(date),
        organizationId: organizationId || 'default'
      });

      await hourLog.save();
      console.log('Hours logged:', hourLog);

      return res.status(201).json({ 
        success: true,
        message: 'Hours logged successfully',
        hourLog: {
          _id: hourLog._id,
          hours: hourLog.hours,
          date: hourLog.date,
          description: hourLog.description
        }
      });
    }
    
    if (action === 'get-hours' && req.method === 'GET') {
      const HourLog = getModel('HourLog', new mongoose.Schema({
        hours: Number,
        description: String,
        date: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const hourLogs = await HourLog.find({ 
        organizationId: req.query.organizationId || 'default'
      }).sort({ date: -1 });

      const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);

      return res.status(200).json({ 
        success: true, 
        hourLogs: hourLogs,
        totalHours
      });
    }
    
    if (action === 'get-stats' && req.method === 'GET') {
      const organizationId = req.query.organizationId || 'default';
      
      // Get all models
      const HourLog = getModel('HourLog', new mongoose.Schema({
        hours: Number,
        description: String,
        date: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const Project = getModel('Project', new mongoose.Schema({
        name: String,
        description: String,
        organizationId: String,
        status: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const Organization = getModel('Organization', new mongoose.Schema({
        name: String,
        description: String,
        joinCode: String,
        createdBy: String,
        members: [{
          user: String,
          role: { type: String, default: 'member' },
          joinedAt: { type: Date, default: Date.now }
        }],
        createdAt: { type: Date, default: Date.now }
      }));
      
      // Get data from all sources
      const [hourLogs, projects, organization] = await Promise.all([
        HourLog.find({ organizationId }),
        Project.find({ organizationId }),
        Organization.findById(organizationId).catch(() => null)
      ]);
      
      // Calculate stats
      const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedTasks = projects.filter(p => p.status === 'completed').length;
      const totalMembers = organization?.members?.length || 1;
      
      return res.status(200).json({ 
        success: true,
        stats: {
          totalHours,
          activeProjects,
          completedTasks,
          totalMembers,
          totalProjects: projects.length
        }
      });
    }
    
    if (action === 'create-project' && req.method === 'POST') {
      const { title, name, description, organizationId } = req.body;
      
      if (!title && !name) {
        return res.status(400).json({ error: 'Title or name is required' });
      }
      
      const Project = getModel('Project', new mongoose.Schema({
        name: String,
        description: String,
        organizationId: String,
        status: { type: String, default: 'active' },
        createdAt: { type: Date, default: Date.now }
      }));
      
      const project = new Project({
        name: title || name,
        description,
        organizationId: organizationId || 'default',
        status: 'active'
      });

      await project.save();
      console.log('Project saved:', project);

      return res.status(201).json({ 
        success: true,
        message: 'Project created successfully',
        project: {
          _id: project._id,
          title: project.name,
          description: project.description,
          status: project.status
        }
      });
    }
    
    if (action === 'get-projects' && req.method === 'GET') {
      const Project = getModel('Project', new mongoose.Schema({
        name: String,
        description: String,
        organizationId: String,
        status: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const projects = await Project.find({ 
        organizationId: req.query.organizationId || 'default'
      }).sort({ createdAt: -1 });

      return res.status(200).json({ 
        success: true, 
        projects: projects.map(p => ({
          _id: p._id,
          title: p.name,
          description: p.description,
          status: p.status
        }))
      });
    }
    
    if (action === 'create-event' && req.method === 'POST') {
      const { title, description, startDate, organizationId } = req.body;
      
      if (!title || !startDate) {
        return res.status(400).json({ error: 'Title and start date are required' });
      }
      
      const Event = getModel('Event', new mongoose.Schema({
        title: String,
        description: String,
        startDate: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const event = new Event({
        title,
        description: description || '',
        startDate: new Date(startDate),
        organizationId: organizationId || 'default'
      });

      await event.save();
      console.log('Event saved:', event);

      return res.status(201).json({ 
        success: true,
        message: 'Event created successfully',
        event: {
          _id: event._id,
          title: event.title,
          description: event.description,
          startDate: event.startDate
        }
      });
    }
    
    if (action === 'get-events' && req.method === 'GET') {
      const Event = getModel('Event', new mongoose.Schema({
        title: String,
        description: String,
        startDate: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const events = await Event.find({ 
        organizationId: req.query.organizationId || 'default'
      }).sort({ startDate: 1 });

      return res.status(200).json({ 
        success: true, 
        events: events
      });
    }
    
    if (action === 'test') {
      return res.status(200).json({ 
        success: true,
        message: 'Working endpoint is accessible',
        action: action,
        method: req.method,
        timestamp: new Date().toISOString(),
        dbConnected: isConnected
      });
    }
    
    // Organization actions
    if (action === 'organizations' && req.method === 'GET') {
      // Get user's organizations
      const Organization = getModel('Organization', new mongoose.Schema({
        name: String,
        description: String,
        joinCode: String,
        createdBy: String,
        members: [{
          user: String,
          role: { type: String, default: 'member' },
          joinedAt: { type: Date, default: Date.now }
        }],
        createdAt: { type: Date, default: Date.now }
      }));
      
      // For now, return a default organization since we don't have user auth in this endpoint
      const defaultOrg = {
        _id: 'default-org-id',
        name: 'Default Organization',
        description: 'Your default organization',
        role: 'admin'
      };
      
      return res.status(200).json({ 
        success: true, 
        organizations: [defaultOrg]
      });
    }
    
    if (action === 'organizations' && req.method === 'POST') {
      const { name, description, inviteCode } = req.body;
      
      if (inviteCode) {
        // Joining an organization
        const Organization = getModel('Organization', new mongoose.Schema({
          name: String,
          description: String,
          joinCode: String,
          createdBy: String,
          members: [{
            user: String,
            role: { type: String, default: 'member' },
            joinedAt: { type: Date, default: Date.now }
          }],
          createdAt: { type: Date, default: Date.now }
        }));
        
        // Find organization by join code
        const organization = await Organization.findOne({ joinCode: inviteCode });
        
        if (!organization) {
          return res.status(404).json({ error: 'Invalid join code' });
        }
        
        return res.status(200).json({ 
          success: true,
          message: 'Successfully joined organization',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            role: 'member'
          }
        });
      } else {
        // Creating a new organization
        if (!name) {
          return res.status(400).json({ error: 'Organization name is required' });
        }
        
        const Organization = getModel('Organization', new mongoose.Schema({
          name: String,
          description: String,
          joinCode: String,
          createdBy: String,
          members: [{
            user: String,
            role: { type: String, default: 'member' },
            joinedAt: { type: Date, default: Date.now }
          }],
          createdAt: { type: Date, default: Date.now }
        }));
        
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const organization = new Organization({
          name,
          description: description || '',
          joinCode,
          createdBy: 'default-user',
          members: [{
            user: 'default-user',
            role: 'admin',
            joinedAt: new Date()
          }]
        });

        await organization.save();
        console.log('Organization created:', organization);

        return res.status(201).json({ 
          success: true,
          message: 'Organization created successfully',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            joinCode: organization.joinCode,
            role: 'admin'
          }
        });
      }
    }
    
    // Socket.io actions
    if (action === 'socket-connect') {
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
    
    if (action === 'socket-disconnect') {
      const { sessionId } = req.body || {};
      
      if (sessionId && connectedUsers.has(sessionId)) {
        connectedUsers.delete(sessionId);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Disconnected from socket server'
      });
    }
    
    if (action === 'socket-emit') {
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
    
    if (action === 'socket-listen') {
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

    return res.status(200).json({ 
      message: 'Working endpoint - no action specified',
      action: action,
      method: req.method
    });
    
  } catch (error) {
    console.error('Working endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    });
  }
}; 