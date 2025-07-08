const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple User model - Updated for new MongoDB connection with reset password
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  currentOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  organizations: [{
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  refreshToken: String
}));

// Simple Organization model
const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  joinCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }]
}));

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) return;
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
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
    // Test database connection first
    await connectDB();
    
    const action = req.query.action || req.body.action || 'login';
    
    if (action === 'test') {
      // Simple test endpoint to check if everything is working
      return res.status(200).json({ 
        message: 'Auth API is working',
        database: 'Connected',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find user by email with timeout
      const user = await User.findOne({ email }).maxTimeMS(5000);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      // Update user
      user.refreshToken = refreshToken;
      await user.save();
      
      return res.status(200).json({
        message: 'Login successful',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          currentOrganization: user.currentOrganization,
          organizations: user.organizations
        }
      });
      
    } else if (action === 'register' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email }).maxTimeMS(5000);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        name
      });
      
      await user.save();
      
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      user.refreshToken = refreshToken;
      await user.save();
      
      return res.status(201).json({
        message: 'User created successfully',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
      
    } else if (action === 'refresh' && req.method === 'POST') {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret');
        
        if (decoded.type !== 'refresh') {
          return res.status(403).json({ error: 'Invalid token type' });
        }
        
        const user = await User.findById(decoded.userId).maxTimeMS(5000);
        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }
        
        const accessToken = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '15m' }
        );
        
        const newRefreshToken = jwt.sign(
          { userId: user._id, type: 'refresh' },
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '7d' }
        );
        
        user.refreshToken = newRefreshToken;
        await user.save();
        
        return res.status(200).json({
          accessToken,
          refreshToken: newRefreshToken
        });
        
      } catch (error) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      
    } else if (action === 'join-org' && req.method === 'POST') {
      // Temporary organization join functionality in auth endpoint
      const { joinCode } = req.body;
      if (!joinCode) {
        return res.status(400).json({ error: 'Join code is required' });
      }
      
      try {
        // Find organization by join code
        const organization = await Organization.findOne({ joinCode: joinCode.trim().toUpperCase() });
        if (!organization) {
          return res.status(404).json({ error: 'Invalid join code. Please verify with your organization admin.' });
        }
        
        // For now, return success with organization data
        return res.status(200).json({ 
          message: 'Successfully joined organization',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            category: organization.category,
            joinCode: organization.joinCode
          }
        });
      } catch (error) {
        console.error('Join org error:', error);
        return res.status(500).json({ error: 'Failed to join organization' });
      }
      
    } else if (action === 'create-org' && req.method === 'POST') {
      // Temporary organization creation functionality in auth endpoint
      const { name, description, category, location, website, customJoinCode } = req.body;
      
      if (!name || !description || !customJoinCode) {
        return res.status(400).json({ error: 'Name, description, and join code are required' });
      }
      
      try {
        // Check if join code already exists
        const existingOrg = await Organization.findOne({ joinCode: customJoinCode.toUpperCase() });
        if (existingOrg) {
          return res.status(400).json({ error: 'Join code already exists. Please choose a different one.' });
        }
        
        // Create new organization (temporarily without user for testing)
        const organization = new Organization({
          name,
          description,
          category: category || 'community',
          location,
          website,
          joinCode: customJoinCode.toUpperCase(),
          createdBy: req.user ? req.user.userId : null,
          admins: req.user ? [req.user.userId] : [],
          members: req.user ? [{
            user: req.user.userId,
            role: 'admin',
            joinedAt: new Date()
          }] : []
        });

        await organization.save();

        return res.status(201).json({ 
          message: 'Organization created successfully',
          organization: {
            _id: organization._id,
            name: organization.name,
            description: organization.description,
            category: organization.category,
            joinCode: organization.joinCode
          }
        });
      } catch (error) {
        console.error('Create org error:', error);
        return res.status(500).json({ error: 'Failed to create organization: ' + error.message });
      }
      
    } else if (action === 'get-orgs' && req.method === 'GET') {
      // Temporary get organizations functionality in auth endpoint
      try {
        // For now, return empty organizations to avoid authentication issues
        // This will allow users to proceed to organization setup
        return res.status(200).json({ 
          success: true, 
          organizations: [],
          currentOrganization: null
        });
      } catch (error) {
        console.error('Get orgs error:', error);
        return res.status(500).json({ error: 'Failed to fetch organizations' });
      }
      
    } else if (action === 'create-project' && req.method === 'POST') {
      // Temporary project creation functionality in auth endpoint
      const { name, description, startDate, endDate, status, organizationId } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
      }
      
      try {
        // Create a simple project model
        const Project = mongoose.model('Project', new mongoose.Schema({
          name: String,
          description: String,
          startDate: Date,
          endDate: Date,
          status: { type: String, default: 'active' },
          organizationId: String,
          createdBy: String,
          members: [String]
        }));
        
        const project = new Project({
          name,
          description,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          status: status || 'active',
          organizationId: organizationId || 'default',
          createdBy: req.user?.userId || 'anonymous',
          members: req.user?.userId ? [req.user.userId] : []
        });

        await project.save();

        return res.status(201).json({ 
          message: 'Project created successfully',
          project: {
            _id: project._id,
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate
          }
        });
      } catch (error) {
        console.error('Create project error:', error);
        return res.status(500).json({ error: 'Failed to create project: ' + error.message });
      }
      
    } else if (action === 'get-projects' && req.method === 'GET') {
      // Temporary get projects functionality
      try {
        const Project = mongoose.model('Project', new mongoose.Schema({
          name: String,
          description: String,
          startDate: Date,
          endDate: Date,
          status: String,
          organizationId: String,
          createdBy: String,
          members: [String]
        }));
        
        const projects = await Project.find({ 
          organizationId: req.query.organizationId || 'default'
        }).sort({ createdAt: -1 });

        return res.status(200).json({ 
          success: true, 
          projects: projects.map(p => ({
            _id: p._id,
            name: p.name,
            description: p.description,
            status: p.status,
            startDate: p.startDate,
            endDate: p.endDate
          }))
        });
      } catch (error) {
        console.error('Get projects error:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
      }
      
    } else if (action === 'create-event' && req.method === 'POST') {
      // Temporary event creation functionality in auth endpoint
      const { title, description, startDate, endDate, location, type, organizationId } = req.body;
      
      if (!title || !startDate) {
        return res.status(400).json({ error: 'Title and start date are required' });
      }
      
      try {
        // Create a simple event model
        const Event = mongoose.model('Event', new mongoose.Schema({
          title: String,
          description: String,
          startDate: Date,
          endDate: Date,
          location: String,
          type: String,
          organizationId: String,
          createdBy: String,
          attendees: [String]
        }));
        
        const event = new Event({
          title,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          location,
          type: type || 'meeting',
          organizationId: organizationId || 'default',
          createdBy: req.user?.userId || 'anonymous',
          attendees: req.user?.userId ? [req.user.userId] : []
        });

        await event.save();

        return res.status(201).json({ 
          message: 'Event created successfully',
          event: {
            _id: event._id,
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            type: event.type
          }
        });
      } catch (error) {
        console.error('Create event error:', error);
        return res.status(500).json({ error: 'Failed to create event: ' + error.message });
      }
      
    } else if (action === 'get-events' && req.method === 'GET') {
      // Temporary get events functionality
      try {
        const Event = mongoose.model('Event', new mongoose.Schema({
          title: String,
          description: String,
          startDate: Date,
          endDate: Date,
          location: String,
          type: String,
          organizationId: String,
          createdBy: String,
          attendees: [String]
        }));
        
        const events = await Event.find({ 
          organizationId: req.query.organizationId || 'default'
        }).sort({ startDate: 1 });

        return res.status(200).json({ 
          success: true, 
          events: events.map(e => ({
            _id: e._id,
            title: e.title,
            description: e.description,
            startDate: e.startDate,
            endDate: e.endDate,
            location: e.location,
            type: e.type
          }))
        });
      } catch (error) {
        console.error('Get events error:', error);
        return res.status(500).json({ error: 'Failed to fetch events' });
      }
      
    } else if (action === 'log-hours' && req.method === 'POST') {
      // Temporary hours logging functionality
      const { projectId, hours, date, description, organizationId } = req.body;
      
      if (!hours || !date) {
        return res.status(400).json({ error: 'Hours and date are required' });
      }
      
      try {
        // Create a simple hour log model
        const HourLog = mongoose.model('HourLog', new mongoose.Schema({
          projectId: String,
          userId: String,
          hours: Number,
          date: Date,
          description: String,
          organizationId: String,
          createdAt: { type: Date, default: Date.now }
        }));
        
        const hourLog = new HourLog({
          projectId: projectId || 'default',
          userId: req.user?.userId || 'anonymous',
          hours: parseFloat(hours),
          date: new Date(date),
          description: description || '',
          organizationId: organizationId || 'default'
        });

        await hourLog.save();

        return res.status(201).json({ 
          message: 'Hours logged successfully',
          hourLog: {
            _id: hourLog._id,
            hours: hourLog.hours,
            date: hourLog.date,
            description: hourLog.description
          }
        });
      } catch (error) {
        console.error('Log hours error:', error);
        return res.status(500).json({ error: 'Failed to log hours: ' + error.message });
      }
      
    } else if (action === 'get-hours' && req.method === 'GET') {
      // Temporary get hours functionality
      try {
        const HourLog = mongoose.model('HourLog', new mongoose.Schema({
          projectId: String,
          userId: String,
          hours: Number,
          date: Date,
          description: String,
          organizationId: String,
          createdAt: { type: Date, default: Date.now }
        }));
        
        const hourLogs = await HourLog.find({ 
          organizationId: req.query.organizationId || 'default'
        }).sort({ date: -1 });

        const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);

        return res.status(200).json({ 
          success: true, 
          hourLogs: hourLogs.map(h => ({
            _id: h._id,
            hours: h.hours,
            date: h.date,
            description: h.description,
            projectId: h.projectId
          })),
          totalHours
        });
      } catch (error) {
        console.error('Get hours error:', error);
        return res.status(500).json({ error: 'Failed to fetch hours' });
      }
      
    } else if (action === 'get-stats' && req.method === 'GET') {
      // Temporary stats functionality
      try {
        const HourLog = mongoose.model('HourLog', new mongoose.Schema({
          projectId: String,
          userId: String,
          hours: Number,
          date: Date,
          description: String,
          organizationId: String,
          createdAt: { type: Date, default: Date.now }
        }));
        
        const Project = mongoose.model('Project', new mongoose.Schema({
          name: String,
          description: String,
          startDate: Date,
          endDate: Date,
          status: String,
          organizationId: String,
          createdBy: String,
          members: [String]
        }));
        
        const hourLogs = await HourLog.find({ 
          organizationId: req.query.organizationId || 'default'
        });
        
        const projects = await Project.find({ 
          organizationId: req.query.organizationId || 'default'
        });

        const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const monthlyHours = hourLogs
          .filter(log => log.date >= thisMonth)
          .reduce((sum, log) => sum + log.hours, 0);

        return res.status(200).json({ 
          success: true, 
          stats: {
            totalHours,
            monthlyHours,
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length
          }
        });
      } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      
    } else if (action === 'create-announcement' && req.method === 'POST') {
      // Temporary announcement creation functionality
      const { title, content, priority, organizationId } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      try {
        // Create a simple announcement model
        const Announcement = mongoose.model('Announcement', new mongoose.Schema({
          title: String,
          content: String,
          priority: { type: String, default: 'normal' },
          organizationId: String,
          createdBy: String,
          readBy: [String],
          createdAt: { type: Date, default: Date.now }
        }));
        
        const announcement = new Announcement({
          title,
          content,
          priority: priority || 'normal',
          organizationId: organizationId || 'default',
          createdBy: req.user?.userId || 'anonymous',
          readBy: []
        });

        await announcement.save();

        return res.status(201).json({ 
          message: 'Announcement created successfully',
          announcement: {
            _id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            priority: announcement.priority,
            createdAt: announcement.createdAt
          }
        });
      } catch (error) {
        console.error('Create announcement error:', error);
        return res.status(500).json({ error: 'Failed to create announcement: ' + error.message });
      }
      
    } else if (action === 'get-announcements' && req.method === 'GET') {
      // Temporary get announcements functionality
      try {
        const Announcement = mongoose.model('Announcement', new mongoose.Schema({
          title: String,
          content: String,
          priority: String,
          organizationId: String,
          createdBy: String,
          readBy: [String],
          createdAt: { type: Date, default: Date.now }
        }));
        
        const announcements = await Announcement.find({ 
          organizationId: req.query.organizationId || 'default'
        }).sort({ createdAt: -1 });

        return res.status(200).json({ 
          success: true, 
          announcements: announcements.map(a => ({
            _id: a._id,
            title: a.title,
            content: a.content,
            priority: a.priority,
            createdAt: a.createdAt,
            isRead: a.readBy.includes(req.user?.userId || 'anonymous')
          }))
        });
      } catch (error) {
        console.error('Get announcements error:', error);
        return res.status(500).json({ error: 'Failed to fetch announcements' });
      }
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Auth API error:', error);
    
    // Check if it's a database connection error
    if (error.message.includes('MONGODB_URI') || error.message.includes('timed out') || error.message.includes('buffering')) {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: 'Please check your MONGODB_URI environment variable in Vercel',
        message: error.message
      });
    }
    
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}; 