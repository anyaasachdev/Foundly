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
    if (isConnected && mongoose.connection.readyState === 1) return;
    
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Close existing connection if it exists
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
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
    
    // Ensure database connection
    await connectDB();
    
    const action = req.query.action || req.body.action || 'test';
    console.log('Action:', action);

    if ((action === 'create-announcement' || action === 'announcements') && req.method === 'POST') {
      const { title, content, organizationId } = req.body;
      
      console.log('Creating announcement with:', { title, content, organizationId });
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      try {
        const Announcement = getModel('Announcement', new mongoose.Schema({
          title: { type: String, required: true },
          content: { type: String, required: true },
          organizationId: { type: String, default: 'default' },
          createdAt: { type: Date, default: Date.now }
        }));
        
        const announcement = new Announcement({
          title: title.trim(),
          content: content.trim(),
          organizationId: organizationId || 'default'
        });

        const savedAnnouncement = await announcement.save();
        console.log('Announcement saved successfully:', savedAnnouncement._id);

        return res.status(201).json({ 
          success: true,
          message: 'Announcement created successfully',
          announcement: {
            _id: savedAnnouncement._id,
            title: savedAnnouncement.title,
            content: savedAnnouncement.content,
            createdAt: savedAnnouncement.createdAt
          }
        });
      } catch (dbError) {
        console.error('Database error creating announcement:', dbError);
        return res.status(500).json({ 
          error: 'Failed to create announcement', 
          details: dbError.message 
        });
      }
    }
    
    if ((action === 'get-announcements' || action === 'announcements') && req.method === 'GET') {
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
    
    if ((action === 'log-hours' || action === 'hours') && req.method === 'POST') {
      try {
        console.log('log-hours endpoint called with data:', req.body);
        const { hours, description, date, organizationId } = req.body;
        
        console.log('Extracted data:', { hours, description, date, organizationId });
        
        if (!hours || !date) {
          console.log('Missing required fields:', { hours: !!hours, date: !!date });
          return res.status(400).json({ error: 'Hours and date are required' });
        }
        
        const HourLog = getModel('HourLog', new mongoose.Schema({
          hours: { type: Number, required: true, min: 0.1, max: 24 },
          description: { type: String, default: '' },
          date: { type: Date, required: true },
          organizationId: { type: String, default: 'default' },
          createdAt: { type: Date, default: Date.now }
        }));
        
        const parsedHours = parseFloat(hours);
        console.log('Parsed hours:', parsedHours);
        
        if (isNaN(parsedHours) || parsedHours <= 0) {
          console.log('Invalid hours value:', parsedHours);
          return res.status(400).json({ error: 'Hours must be a positive number' });
        }
        
        const hourLogData = {
          hours: parsedHours,
          description: description || '',
          date: new Date(date),
          organizationId: organizationId || 'default'
        };
        
        console.log('Creating hour log with data:', hourLogData);
        const hourLog = new HourLog(hourLogData);

        console.log('Saving hour log to database...');
        const savedHourLog = await hourLog.save();
        console.log('Hours logged successfully:', savedHourLog._id);

        return res.status(201).json({ 
          success: true,
          message: 'Hours logged successfully',
          hourLog: {
            _id: savedHourLog._id,
            hours: savedHourLog.hours,
            date: savedHourLog.date,
            description: savedHourLog.description
          }
        });
      } catch (hourLogError) {
        console.error('Error in log-hours endpoint:', hourLogError);
        console.error('Error stack:', hourLogError.stack);
        return res.status(500).json({ 
          error: 'Failed to log hours', 
          details: hourLogError.message,
          stack: hourLogError.stack
        });
      }
    }
    
    if ((action === 'get-hours' || action === 'hours') && req.method === 'GET') {
      const HourLog = getModel('HourLog', new mongoose.Schema({
        hours: Number,
        description: String,
        date: Date,
        organizationId: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      // Get organization ID from query params
      const organizationId = req.query.organizationId || 'default';
      console.log('Getting hours for organization:', organizationId);
      
      const hourLogs = await HourLog.find({ 
        organizationId: organizationId
      }).sort({ date: -1 });

      const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);
      
      console.log(`Found ${hourLogs.length} hour logs with total ${totalHours} hours for org ${organizationId}`);

      return res.status(200).json({ 
        success: true, 
        hourLogs: hourLogs,
        totalHours
      });
    }
    
    if ((action === 'get-stats' || action === 'stats') && req.method === 'GET') {
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
      
      // Fix: Count unique, active members only
      const uniqueActiveMembers = (organization?.members || [])
        .filter((member, index, arr) => {
          // Ensure member has a valid user ID
          if (!member.user) return false;
          
          // Check if this is the first occurrence of this user ID (remove duplicates)
          const firstIndex = arr.findIndex(m => m.user.toString() === member.user.toString());
          if (firstIndex !== index) return false;
          
          // Optionally check if member is active (if isActive field exists)
          if (member.hasOwnProperty('isActive') && member.isActive === false) return false;
          
          return true;
        });
      
      const totalMembers = uniqueActiveMembers.length || 1;
      
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
    
    if ((action === 'create-project' || action === 'projects') && req.method === 'POST') {
      const { title, name, description, organizationId } = req.body;
      
      if (!title && !name) {
        return res.status(400).json({ error: 'Title or name is required' });
      }
      
      const Project = getModel('Project', new mongoose.Schema({
        name: { type: String, required: true },
        description: { type: String, default: '' },
        organizationId: { type: String, default: 'default' },
        status: { type: String, default: 'active' },
        createdAt: { type: Date, default: Date.now }
      }));
      
      const project = new Project({
        name: (title || name).trim(),
        description: description ? description.trim() : '',
        organizationId: organizationId || 'default',
        status: 'active'
      });

      const savedProject = await project.save();
      console.log('Project saved successfully:', savedProject._id);

      return res.status(201).json({ 
        success: true,
        message: 'Project created successfully',
        project: {
          _id: savedProject._id,
          title: savedProject.name,
          description: savedProject.description,
          status: savedProject.status
        }
      });
    }
    
    if ((action === 'get-projects' || action === 'projects') && req.method === 'GET') {
      const Project = getModel('Project', new mongoose.Schema({
        name: String,
        description: String,
        organizationId: String,
        status: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const organizationId = req.query.organizationId || 'default';
      console.log('Getting projects for organization:', organizationId);
      
      const projects = await Project.find({ 
        organizationId: organizationId
      }).sort({ createdAt: -1 });
      
      console.log(`Found ${projects.length} projects for org ${organizationId}`);

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
    
    if ((action === 'update-project' || action === 'projects') && req.method === 'PUT') {
      const { projectId, status, title, description } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const Project = getModel('Project', new mongoose.Schema({
        name: String,
        description: String,
        organizationId: String,
        status: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      try {
        const updateData = {};
        if (status) updateData.status = status;
        if (title) updateData.name = title;
        if (description) updateData.description = description;
        
        const updatedProject = await Project.findByIdAndUpdate(
          projectId,
          updateData,
          { new: true }
        );
        
        if (!updatedProject) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        console.log('Project updated:', updatedProject._id, updateData);
        
        return res.status(200).json({ 
          success: true,
          message: 'Project updated successfully',
          project: {
            _id: updatedProject._id,
            title: updatedProject.name,
            description: updatedProject.description,
            status: updatedProject.status
          }
        });
      } catch (error) {
        console.error('Error updating project:', error);
        return res.status(500).json({ 
          error: 'Failed to update project', 
          details: error.message 
        });
      }
    }
    
    if ((action === 'create-event' || action === 'events') && req.method === 'POST') {
      const { title, description, startDate, organizationId } = req.body;
      
      if (!title || !startDate) {
        return res.status(400).json({ error: 'Title and start date are required' });
      }
      
      const Event = getModel('Event', new mongoose.Schema({
        title: { type: String, required: true },
        description: { type: String, default: '' },
        startDate: { type: Date, required: true },
        organizationId: { type: String, default: 'default' },
        createdAt: { type: Date, default: Date.now }
      }));
      
      const event = new Event({
        title: title.trim(),
        description: description ? description.trim() : '',
        startDate: new Date(startDate),
        organizationId: organizationId || 'default'
      });

      const savedEvent = await event.save();
      console.log('Event saved successfully:', savedEvent._id);

      return res.status(201).json({ 
        success: true,
        message: 'Event created successfully',
        event: {
          _id: savedEvent._id,
          title: savedEvent.title,
          description: savedEvent.description,
          startDate: savedEvent.startDate
        }
      });
    }
    
    if ((action === 'get-events' || action === 'events') && req.method === 'GET') {
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
      try {
        // Get user ID from token (for now we'll use a placeholder)
        const userId = req.headers.authorization?.replace('Bearer ', '') || 'current-user';
        
        const Organization = getModel('Organization', new mongoose.Schema({
          name: String,
          description: String,
          joinCode: String,
          createdBy: String,
          members: [{
            userId: String,
            userEmail: String,
            userName: String,
            role: { type: String, default: 'member' },
            joinedAt: { type: Date, default: Date.now }
          }],
          createdAt: { type: Date, default: Date.now }
        }));
        
        // Find organizations where user is a member OR created by user
        const organizations = await Organization.find({
          $or: [
            { createdBy: userId },
            { 'members.userId': userId }
          ]
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${organizations.length} organizations for user ${userId}`);
        
        // Format organizations for frontend with proper role detection
        const formattedOrgs = organizations.map(org => {
          const isCreator = org.createdBy === userId;
          const memberRecord = org.members.find(m => m.userId === userId);
          const role = isCreator ? 'admin' : (memberRecord?.role || 'member');
          
          return {
            _id: org._id,
            name: org.name,
            description: org.description,
            joinCode: org.joinCode,
            role: role,
            members: org.members || [],
            memberCount: org.members?.length || 0,
            isCreator: isCreator
          };
        });
        
        return res.status(200).json({ 
          success: true, 
          organizations: formattedOrgs
        });
      } catch (error) {
        console.error('Error fetching organizations:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch organizations', 
          details: error.message 
        });
      }
    }
    
    if (action === 'organizations' && req.method === 'POST') {
      const { name, description, inviteCode, customJoinCode, userEmail, userName } = req.body;
      const userId = req.headers.authorization?.replace('Bearer ', '') || 'current-user';
      
      if (inviteCode) {
        // Joining an organization
        const Organization = getModel('Organization', new mongoose.Schema({
          name: String,
          description: String,
          joinCode: String,
          createdBy: String,
          members: [{
            userId: String,
            userEmail: String,
            userName: String,
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
        
        // Check if user is already a member
        const existingMember = organization.members.find(m => m.userId === userId);
        if (existingMember) {
          return res.status(200).json({ 
            success: true,
            message: 'Already a member of this organization',
            organization: {
              _id: organization._id,
              name: organization.name,
              description: organization.description,
              role: existingMember.role,
              memberCount: organization.members.length
            }
          });
        }
        
        // Add user to organization members
        organization.members.push({
          userId: userId,
          userEmail: userEmail || 'unknown@email.com',
          userName: userName || 'Unknown User',
          role: 'member',
          joinedAt: new Date()
        });
        
        await organization.save();
        console.log('User joined organization:', organization.name, 'Total members:', organization.members.length);
        
        return res.status(200).json({ 
          success: true,
          message: 'Successfully joined organization',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            role: 'member',
            memberCount: organization.members.length
          }
        });
      } else {
        // Creating a new organization
        if (!name) {
          return res.status(400).json({ error: 'Organization name is required' });
        }
        
        if (!customJoinCode) {
          return res.status(400).json({ error: 'Custom join code is required' });
        }
        
        // Validate custom join code format
        if (customJoinCode.length < 6 || customJoinCode.length > 10) {
          return res.status(400).json({ error: 'Join code must be between 6-10 characters' });
        }
        
        const Organization = getModel('Organization', new mongoose.Schema({
          name: String,
          description: String,
          joinCode: String,
          createdBy: String,
          members: [{
            userId: String,
            userEmail: String,
            userName: String,
            role: { type: String, default: 'member' },
            joinedAt: { type: Date, default: Date.now }
          }],
          createdAt: { type: Date, default: Date.now }
        }));
        
        // Check if join code already exists
        const existingOrg = await Organization.findOne({ joinCode: customJoinCode.toUpperCase() });
        if (existingOrg) {
          return res.status(400).json({ error: 'This join code is already taken. Please choose a different one.' });
        }
        
        // Use the custom join code provided by the user
        const joinCode = customJoinCode.toUpperCase();
        
        const organization = new Organization({
          name,
          description: description || '',
          joinCode,
          createdBy: userId,
          members: [{
            userId: userId,
            userEmail: userEmail || 'admin@email.com',
            userName: userName || 'Admin User',
            role: 'admin',
            joinedAt: new Date()
          }]
        });

        await organization.save();
        console.log('Organization created with custom join code:', organization.name, 'Creator:', userId);

        return res.status(201).json({ 
          success: true,
          message: 'Organization created successfully',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            joinCode: organization.joinCode,
            role: 'admin',
            memberCount: 1
          }
        });
      }
    }
    
    if (action === 'get-analytics' && req.method === 'GET') {
      const organizationId = req.query.organizationId || 'default';
      const timeRange = req.query.timeRange || 'month';
      
      try {
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
        
        // Calculate date range based on timeRange
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        // Get hour logs in date range
        const hourLogs = await HourLog.find({
          organizationId,
          createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });
        
        // Get projects in date range
        const projects = await Project.find({
          organizationId,
          createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });
        
        // Group data by time periods
        const timeGroups = {};
        const formatDate = (date) => {
          switch (timeRange) {
            case 'week':
              return date.toLocaleDateString('en-US', { weekday: 'short' });
            case 'month':
            case 'quarter':
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'year':
              return date.toLocaleDateString('en-US', { month: 'short' });
            default:
              return date.toLocaleDateString('en-US', { month: 'short' });
          }
        };
        
        // Initialize time groups
        const periods = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
        for (let i = 0; i < Math.min(periods, 12); i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * Math.floor(periods / 12)));
          const key = formatDate(date);
          timeGroups[key] = { hours: 0, projects: 0, members: 1, date };
        }
        
        // Aggregate hour logs
        hourLogs.forEach(log => {
          const key = formatDate(log.createdAt);
          if (timeGroups[key]) {
            timeGroups[key].hours += log.hours;
          }
        });
        
        // Aggregate projects
        projects.forEach(project => {
          const key = formatDate(project.createdAt);
          if (timeGroups[key]) {
            timeGroups[key].projects++;
          }
        });
        
        // Convert to array and calculate impact
        const trends = Object.entries(timeGroups)
          .map(([month, data]) => ({
            month,
            hours: data.hours,
            projects: data.projects,
            members: data.members,
            impact: (data.projects * 10) + (data.hours * 2) + (data.members * 5)
          }))
          .sort((a, b) => timeGroups[a.month].date - timeGroups[b.month].date);
        
        return res.status(200).json({
          success: true,
          analytics: {
            trends,
            summary: {
              totalHours: hourLogs.reduce((sum, log) => sum + log.hours, 0),
              totalProjects: projects.length,
              activeProjects: projects.filter(p => p.status === 'active').length,
              completedProjects: projects.filter(p => p.status === 'completed').length
            }
          }
        });
      } catch (error) {
        console.error('Error getting analytics:', error);
        return res.status(500).json({
          error: 'Failed to get analytics',
          details: error.message
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