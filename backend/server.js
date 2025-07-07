const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Organization = require('./models/Organization');
const Message = require('./models/Message');
const Announcement = require('./models/Announcement');
const Project = require('./models/Project');
const Event = require('./models/Event');
const HourLog = require('./models/HourLog');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://foundly-olive.vercel.app",
      "https://foundly-olive-git-main.vercel.app"
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.'
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('name').trim().isLength({ min: 2, max: 50 }).escape()
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// AUTH ROUTES
app.post('/api/auth/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    // Generate both access and refresh tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short-lived access token
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' } // Longer-lived refresh token
    );

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('currentOrganization');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed login attempts' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.loginAttempts > 0) {
      await user.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
      });
    }

    // Generate both access and refresh tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short-lived access token
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' } // Longer-lived refresh token
    );

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // Check if user exists and has this refresh token
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );
    
    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Refresh token expired' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Invalidate refresh token by removing it from user document
    await User.findByIdAndUpdate(req.user.userId, {
      $unset: { refreshToken: 1 }
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ORGANIZATION ROUTES
app.post('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const { name, description, location, website, category, customJoinCode } = req.body;
    
    // Check if custom join code already exists
    if (customJoinCode) {
      const existingOrg = await Organization.findOne({ joinCode: customJoinCode.toUpperCase() });
      if (existingOrg) {
        return res.status(400).json({ error: 'This join code is already taken. Please choose a different one.' });
      }
    }
    
    const organization = new Organization({
      name,
      description,
      location,
      website,
      category,
      joinCode: customJoinCode ? customJoinCode.toUpperCase() : undefined, // Use custom or auto-generate
      createdBy: req.user.userId,
      admins: [req.user.userId],
      members: [{
        user: req.user.userId,
        role: 'admin'
      }]
    });
    
    await organization.save();
    
    await User.findByIdAndUpdate(req.user.userId, {
      $push: {
        organizations: {
          organizationId: organization._id,
          role: 'admin'
        }
      },
      currentOrganization: organization._id
    });
    
    res.status(201).json({ organization }); // Wrap in object
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

app.get('/api/organizations/my', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('organizations.organizationId');
    res.json(user.organizations || []);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

app.post('/api/organizations/join', authenticateToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    
    if (!joinCode || !joinCode.trim()) {
      return res.status(400).json({ error: 'Join code is required' });
    }
    
    const organization = await Organization.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!organization) {
      return res.status(404).json({ error: 'Invalid join code. Please verify with your organization admin.' });
    }
    
    // Check if user is already a member in the organization
    const isInOrgMembers = organization.members.some(member => 
      member.user.toString() === req.user.userId.toString()
    );
    
    // Check if user has the organization in their organizations array
    const user = await User.findById(req.user.userId);
    const isInUserOrgs = user.organizations.some(org => 
      org.organizationId.toString() === organization._id.toString()
    );
    
    // If user is in org members but not in user orgs (data inconsistency), fix it
    if (isInOrgMembers && !isInUserOrgs) {
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          organizations: {
            organizationId: organization._id,
            role: 'member'
          }
        },
        currentOrganization: organization._id
      });
      return res.json({ 
        message: 'Organization membership restored', 
        organization,
        wasInconsistent: true 
      });
    }
    
    // If user is already a member in both places
    if (isInOrgMembers && isInUserOrgs) {
      return res.status(400).json({ error: 'You are already a member of this organization' });
    }
    
    // If user is not a member anywhere, add them
    if (!isInOrgMembers && !isInUserOrgs) {
      // Add user to organization
      organization.members.push({
        user: req.user.userId,
        role: 'member'
      });
      await organization.save();
      
      // Add organization to user
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          organizations: {
            organizationId: organization._id,
            role: 'member'
          }
        },
        currentOrganization: organization._id // Set as current org
      });
      
      res.json({ message: 'Successfully joined organization', organization });
    }
  } catch (error) {
    console.error('Join organization error:', error);
    res.status(500).json({ error: 'Failed to join organization' });
  }
});

app.post('/api/user/switch-organization', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    const user = await User.findById(req.user.userId);
    const hasAccess = user.organizations.some(org => 
      org.organizationId.toString() === organizationId
    );
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'No access to this organization' });
    }
    
    await User.findByIdAndUpdate(req.user.userId, {
      currentOrganization: organizationId
    });
    
    res.json({ message: 'Organization switched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch organization' });
  }
});

app.post('/api/organizations/:id/leave', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.userId;
    
    // Remove user from organization members
    await Organization.findByIdAndUpdate(organizationId, {
      $pull: { members: { user: userId } }
    });
    
    // Remove organization from user's organizations
    const user = await User.findByIdAndUpdate(userId, {
      $pull: { organizations: { organizationId: organizationId } }
    }, { new: true });
    
    // If this was the current organization, set a new one or null
    if (user.currentOrganization?.toString() === organizationId) {
      const newCurrentOrg = user.organizations.length > 0 ? user.organizations[0].organizationId : null;
      await User.findByIdAndUpdate(userId, {
        currentOrganization: newCurrentOrg
      });
    }
    
    res.json({ message: 'Successfully left organization' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave organization' });
  }
});

// ANNOUNCEMENT ROUTES
app.post('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const { title, content, type, targetAudience, expiresAt } = req.body;
    
    const user = await User.findById(req.user.userId);
    const userOrg = user.organizations.find(org => 
      org.organizationId.toString() === user.currentOrganization.toString()
    );
    
    if (!userOrg || !['admin', 'moderator'].includes(userOrg.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const announcement = new Announcement({
      title,
      content,
      type,
      targetAudience,
      expiresAt,
      organizationId: user.currentOrganization,
      createdBy: req.user.userId
    });
    
    await announcement.save();
    
    // Broadcast to organization members
    io.to(`org_${user.currentOrganization}`).emit('new_announcement', announcement);
    
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

app.get('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const announcements = await Announcement.find({
      organizationId: user.currentOrganization,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }).populate('createdBy', 'name').sort({ createdAt: -1 });
    
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/announcements/:id/read', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Check if user has already read this announcement
    const alreadyRead = announcement.readBy.some(readEntry => 
      readEntry.user.toString() === req.user.userId.toString()
    );
    
    if (!alreadyRead) {
      announcement.readBy.push({
        user: req.user.userId,
        readAt: new Date()
      });
      await announcement.save();
    }
    
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// EXISTING ROUTES
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId },
        { recipient: req.user.userId }
      ]
    }).populate('sender recipient', 'name email').sort({ createdAt: -1 }).limit(50);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', authenticateToken, [
  body('recipient').isMongoId(),
  body('content').trim().isLength({ min: 1, max: 1000 }).escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipient, content } = req.body;

    const message = new Message({
      sender: req.user.userId,
      recipient,
      content
    });

    await message.save();
    await message.populate('sender recipient', 'name email');

    io.to(recipient).emit('new_message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user.userId } },
      'name email'
    ).limit(20);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SOCKET.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = user.userId;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  socket.join(socket.userId);
  
  // Join organization room
  User.findById(socket.userId).then(user => {
    if (user.currentOrganization) {
      socket.join(`org_${user.currentOrganization}`);
    }
  });
  
  socket.on('join_organization', (orgId) => {
    socket.join(`org_${orgId}`);
  });
  
  socket.on('leave_organization', (orgId) => {
    socket.leave(`org_${orgId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Projects endpoints
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const projects = await Project.find({ organization: user.currentOrganization })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json({ data: projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const project = new Project({
      ...req.body,
      organization: user.currentOrganization,
      createdBy: req.user.userId
    });
    await project.save();
    await project.populate('createdBy', 'name email');
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const project = await Project.findOne({ _id: req.params.id, organization: user.currentOrganization });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    // Only allow updating certain fields
    const allowedFields = ['title', 'description', 'status', 'priority', 'category', 'assignedTo', 'dueDate', 'completed', 'progress'];
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        project[key] = req.body[key];
      }
    }
    await project.save();
    await project.populate('createdBy', 'name email');
    await project.populate('assignedTo', 'name email');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// EVENT ENDPOINTS
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    console.log('Fetching events for organization:', user.currentOrganization);
    
    const events = await Event.find({ organization: user.currentOrganization })
      .populate('createdBy', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ startDate: 1 });
    
    console.log('Found events:', events.length);
    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    console.log('Creating event with data:', req.body);
    console.log('User current organization:', user.currentOrganization);
    
    const event = new Event({
      ...req.body,
      organization: user.currentOrganization,
      createdBy: req.user.userId
    });
    await event.save();
    await event.populate('createdBy', 'name email');
    res.status(201).json({ data: event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, organization: user.currentOrganization },
      req.body,
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      organization: user.currentOrganization
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// HOUR LOG ENDPOINTS
app.get('/api/hours', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const hours = await HourLog.find({ organization: user.currentOrganization })
      .populate('user', 'name email')
      .populate('project', 'title')
      .sort({ date: -1 });
    res.json({ data: hours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hours' });
  }
});

app.post('/api/hours', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    console.log('Logging hours with data:', req.body);
    console.log('User current organization:', user.currentOrganization);
    
    const hourLog = new HourLog({
      ...req.body,
      user: req.user.userId,
      organization: user.currentOrganization
    });
    await hourLog.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.hoursVolunteered': hourLog.hours }
    });
    
    console.log('Hours logged successfully:', hourLog);
    res.status(201).json({ data: hourLog });
  } catch (error) {
    console.error('Error logging hours:', error);
    res.status(500).json({ error: 'Failed to log hours' });
  }
});

// STATS ENDPOINT
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const orgId = user.currentOrganization;
    
    const [totalProjects, activeProjects, totalHours, totalMembers] = await Promise.all([
      Project.countDocuments({ organization: orgId }),
      Project.countDocuments({ organization: orgId, status: 'active' }),
      HourLog.aggregate([
        { $match: { organization: orgId } },
        { $group: { _id: null, total: { $sum: '$hours' } } }
      ]),
      User.countDocuments({ 'organizations.organizationId': orgId })
    ]);
    
    res.json({
      data: {
        totalProjects,
        activeProjects,
        totalHours: totalHours[0]?.total || 0,
        totalMembers
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ANALYTICS ENDPOINT
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const orgId = user.currentOrganization;
    const { timeRange = 'month' } = req.query;
    
    // Calculate date range based on timeRange
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get real data from database
    const [totalHours, activeProjects, completedProjects, totalMembers, hourLogs, projects, organization] = await Promise.all([
      HourLog.aggregate([
        { $match: { organization: orgId } },
        { $group: { _id: null, total: { $sum: '$hours' } } }
      ]),
      Project.countDocuments({ organization: orgId, status: 'active' }),
      Project.countDocuments({ organization: orgId, status: 'completed' }),
      User.countDocuments({ 'organizations.organizationId': orgId }),
      HourLog.find({ 
        organization: orgId,
        date: { $gte: startDate.toISOString().split('T')[0] }
      }).sort({ date: 1 }),
      Project.find({ organization: orgId }).sort({ createdAt: -1 }),
      Organization.findById(orgId).populate('members.user', 'name email')
    ]);
    
    const totalProjects = activeProjects + completedProjects;
    
    // Calculate member performance data
    const memberPerformance = [];
    if (organization?.members) {
      for (const member of organization.members) {
        const memberId = member.user._id;
        
        // Get hours logged by this member
        const memberHours = await HourLog.aggregate([
          { $match: { organization: orgId, user: memberId } },
          { $group: { _id: null, total: { $sum: '$hours' } } }
        ]);
        
        // Get projects assigned to this member
        const memberProjects = await Project.countDocuments({
          organization: orgId,
          assignedTo: memberId
        });
        
        // Calculate member impact score
        const memberImpact = (memberProjects * 10) + ((memberHours[0]?.total || 0) * 2) + 5;
        
        memberPerformance.push({
          user: member.user,
          role: member.role,
          hours: memberHours[0]?.total || 0,
          projects: memberProjects,
          impact: memberImpact
        });
      }
    }
    
    // Calculate historical trends by month
    const months = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Get hours for this month
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthHours = hourLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= monthStart && logDate <= monthEnd;
      }).reduce((sum, log) => sum + log.hours, 0);
      
      // Get projects created in this month
      const monthProjects = projects.filter(project => {
        const projectDate = new Date(project.createdAt);
        return projectDate >= monthStart && projectDate <= monthEnd;
      }).length;
      
      months.push({
        month: monthName,
        hours: monthHours,
        projects: monthProjects,
        members: totalMembers, // For now, assume member count is constant
        impact: (monthProjects * 10) + (monthHours * 2) + (totalMembers * 5)
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Calculate growth percentages
    const currentMonth = months[months.length - 1] || { hours: 0, projects: 0, members: totalMembers, impact: 0 };
    const previousMonth = months[months.length - 2] || { hours: 0, projects: 0, members: totalMembers, impact: 0 };
    
    const hoursGrowth = previousMonth.hours > 0 ? ((currentMonth.hours - previousMonth.hours) / previousMonth.hours) * 100 : 0;
    const projectsGrowth = previousMonth.projects > 0 ? ((currentMonth.projects - previousMonth.projects) / previousMonth.projects) * 100 : 0;
    const impactGrowth = previousMonth.impact > 0 ? ((currentMonth.impact - previousMonth.impact) / previousMonth.impact) * 100 : 0;
    
    // Calculate project categories
    const categoryCounts = {};
    projects.forEach(project => {
      const category = project.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const projectCategories = Object.entries(categoryCounts).map(([category, count], index) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: Math.round((count / projects.length) * 100),
      projects: count,
      hours: Math.round((totalHours[0]?.total || 0) * (count / projects.length)),
      color: colors[index % colors.length]
    }));
    
    const analyticsData = {
      overview: {
        totalHours: totalHours[0]?.total || 0,
        hoursGrowth: Math.round(hoursGrowth),
        projectsCompleted: completedProjects,
        projectsActive: activeProjects,
        membersRecruited: totalMembers,
        memberGrowth: 0, // For now, assume no member growth
        impactScore: (activeProjects * 10) + ((totalHours[0]?.total || 0) * 2) + (totalMembers * 5),
        impactGrowth: Math.round(impactGrowth)
      },
      trends: {
        projectProgress: months,
        projectCategories: projectCategories,
        memberActivity: memberPerformance
      },
      projects: { 
        performance: projects.map(project => ({
          name: project.title,
          completion: project.status === 'completed' ? 100 : project.status === 'active' ? 75 : 25,
          members: project.assignedTo?.length || 1,
          status: project.status,
          deadline: project.dueDate || new Date().toISOString()
        }))
      }
    };
    
    res.json({ data: analyticsData });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// USER ACTIVITY ENDPOINT
app.get('/api/user/activity', authenticateToken, async (req, res) => {
  try {
    // Return empty activity for now
    res.json({ activities: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// New endpoint to fix organization data inconsistencies
app.post('/api/user/fix-organizations', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const fixedOrgs = [];
    
    // Check each organization the user thinks they're in
    for (const userOrg of user.organizations) {
      const organization = await Organization.findById(userOrg.organizationId);
      if (organization) {
        // Check if user is actually in the organization's members list
        const isInOrgMembers = organization.members.some(member => 
          member.user.toString() === req.user.userId.toString()
        );
        
        if (!isInOrgMembers) {
          // Add user back to organization members
          organization.members.push({
            user: req.user.userId,
            role: userOrg.role || 'member'
          });
          await organization.save();
          fixedOrgs.push(organization.name);
        }
      }
    }
    
    // Also check organizations where user is in members but not in user orgs
    const allOrgs = await Organization.find({
      'members.user': req.user.userId
    });
    
    for (const org of allOrgs) {
      const isInUserOrgs = user.organizations.some(userOrg => 
        userOrg.organizationId.toString() === org._id.toString()
      );
      
      if (!isInUserOrgs) {
        // Add organization back to user's organizations
        await User.findByIdAndUpdate(req.user.userId, {
          $push: {
            organizations: {
              organizationId: org._id,
              role: 'member'
            }
          }
        });
        fixedOrgs.push(org.name);
      }
    }
    
    // Refresh user data
    const updatedUser = await User.findById(req.user.userId).populate('organizations.organizationId');
    
    res.json({ 
      message: 'Organization data fixed', 
      fixedOrganizations: fixedOrgs,
      organizations: updatedUser.organizations 
    });
  } catch (error) {
    console.error('Fix organizations error:', error);
    res.status(500).json({ error: 'Failed to fix organizations' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'phone', 'title', 'department', 'bio', 'location', 'website', 'github', 'linkedin', 'avatar', 'skills', 'achievements', 'socialLinks', 'preferences'];
    const updateData = {};
    
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});



// Health check endpoint for debugging
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      frontendUrl: process.env.FRONTEND_URL,
      allowedOrigins: [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "https://foundly-olive.vercel.app",
        "https://foundly-olive-git-main.vercel.app"
      ].filter(Boolean)
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Foundly server running at http://localhost:${PORT}`);
});
