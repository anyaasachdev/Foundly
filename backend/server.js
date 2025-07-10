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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
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
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
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

    // Find all users with this email (since we allow multiple users with same email)
    const users = await User.find({ email }).populate('currentOrganization');
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Find the user with the correct password
    let user = null;
    for (const potentialUser of users) {
      if (await potentialUser.comparePassword(password)) {
        user = potentialUser;
        break;
      }
    }

    if (!user) {
      // Increment login attempts for the first user found (for security tracking)
      if (users.length > 0) {
        await users[0].incLoginAttempts();
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed login attempts' });
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
    
    // Ensure we have a valid user ID
    const userId = req.user.userId;
    console.log('🔍 Creating organization with user ID:', userId);
    console.log('🔍 User object from token:', req.user);
    
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      console.error('❌ Invalid user ID from token:', userId);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    const organization = new Organization({
      name,
      description,
      location,
      website,
      category,
      joinCode: customJoinCode ? customJoinCode.toUpperCase() : undefined, // Use custom or auto-generate
      createdBy: userId,
      admins: [userId],
      members: [{
        user: userId,
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }],
      // Initialize with zero stats - no data leakage
      stats: {
        totalMembers: 1, // Only the creator
        totalHours: 0,
        activeProjects: 0,
        completedTasks: 0
      },
      createdAt: new Date()
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
    console.log('🔍 Getting organizations for user:', req.user.userId);
    const user = await User.findById(req.user.userId).populate('organizations.organizationId');
    if (!user) {
      console.warn('⚠️ User not found for organizations/my:', req.user.userId);
      return res.json({ organizations: [], success: true, count: 0 });
    }
    if (!user.organizations || user.organizations.length === 0) {
      console.warn('⚠️ No organizations found for user:', user.email);
      return res.json({ organizations: [], success: true, count: 0 });
    }
    // Defensive: ensure population worked
    const orgs = user.organizations.map(org => {
      if (!org.organizationId || typeof org.organizationId !== 'object') {
        console.warn('⚠️ Organization population failed for org:', org);
      }
      return org;
    });
    console.log('📊 User organizations:', orgs);
    res.json({ 
      organizations: orgs,
      success: true,
      count: orgs.length
    });
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

// Health check endpoint moved to end of file

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
    
    if (!user.currentOrganization) {
      return res.status(400).json({ error: 'No organization selected' });
    }
    
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      startTime, 
      endTime, 
      type, 
      location, 
      attendees, 
      reminder, 
      recurring, 
      color 
    } = req.body;

    if (!title || !startDate || !startTime) {
      return res.status(400).json({ error: 'Title, start date, and start time are required' });
    }

    // Combine date and time for start
    const startDateTime = new Date(`${startDate}T${startTime}`);
    
    // Handle end date/time
    let endDateTime;
    if (endDate && endTime) {
      endDateTime = new Date(`${endDate}T${endTime}`);
    } else if (endDate) {
      // If only end date is provided, use start time
      endDateTime = new Date(`${endDate}T${startTime}`);
    } else {
      // If no end date/time, use start date/time + 1 hour
      endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    }
    
    const event = new Event({
      title,
      description,
      organization: user.currentOrganization,
      createdBy: req.user.userId,
      startDate: startDateTime,
      endDate: endDateTime,
      type: type || 'meeting',
      location: location || '',
      attendees: attendees ? attendees.map(email => ({ user: email, status: 'pending' })) : [],
      reminder: reminder || 15,
      recurring: recurring || 'none',
      color: color || '#667eea'
    });
    
    await event.save();
    await event.populate('createdBy', 'name email');
    
    console.log('Event created successfully:', event);
    res.status(201).json({ data: event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const event = await Event.findOne({ _id: req.params.id, organization: user.currentOrganization });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      startTime, 
      endTime, 
      type, 
      location, 
      attendees, 
      reminder, 
      recurring, 
      color 
    } = req.body;

    // Update fields if provided
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (type !== undefined) event.type = type;
    if (location !== undefined) event.location = location;
    if (attendees !== undefined) {
      event.attendees = attendees.map(email => ({ user: email, status: 'pending' }));
    }
    if (reminder !== undefined) event.reminder = reminder;
    if (recurring !== undefined) event.recurring = recurring;
    if (color !== undefined) event.color = color;
    
    // Handle date/time updates
    if (startDate !== undefined && startTime !== undefined) {
      event.startDate = new Date(`${startDate}T${startTime}`);
    }
    if (endDate !== undefined && endTime !== undefined) {
      event.endDate = new Date(`${endDate}T${endTime}`);
    } else if (endDate !== undefined && startTime !== undefined) {
      event.endDate = new Date(`${endDate}T${startTime}`);
    }

    await event.save();
    await event.populate('createdBy', 'name email');
    
    res.json({ data: event });
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event: ' + error.message });
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
    
    if (!user.currentOrganization) {
      return res.status(400).json({ error: 'No organization selected' });
    }
    
    const { hours, description, date, project, category } = req.body;

    if (!hours || !description || !date) {
      return res.status(400).json({ error: 'Hours, description, and date are required' });
    }

    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ error: 'Hours must be a positive number' });
    }
    
    const hourLog = new HourLog({
      user: req.user.userId,
      organization: user.currentOrganization,
      hours: parseFloat(hours),
      description,
      date: new Date(date),
      project: project || null,
      category: category || 'volunteer'
    });
    
    await hourLog.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.hoursVolunteered': hourLog.hours }
    });
    
    // Populate user info for response
    await hourLog.populate('user', 'name email');
    
    // Calculate new total hours for the organization
    const totalHours = await HourLog.aggregate([
      { $match: { organization: user.currentOrganization } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]);
    
    console.log('Hours logged successfully:', hourLog);
    console.log('New total hours for organization:', totalHours[0]?.total || 0);
    
    res.status(201).json({ 
      data: hourLog,
      totalHours: totalHours[0]?.total || 0
    });
  } catch (error) {
    console.error('Error logging hours:', error);
    res.status(500).json({ error: 'Failed to log hours: ' + error.message });
  }
});

// STATS ENDPOINT
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const orgId = user.currentOrganization;
    
    console.log('🔍 Getting stats for organization:', orgId);
    
    const [totalProjects, activeProjects, totalHours, organization] = await Promise.all([
      Project.countDocuments({ organization: orgId }),
      Project.countDocuments({ organization: orgId, status: 'active' }),
      HourLog.aggregate([
        { $match: { organization: orgId } },
        { $group: { _id: null, total: { $sum: '$hours' } } }
      ]),
      Organization.findById(orgId)
    ]);
    
    console.log('📊 Organization found:', organization?.name);
    console.log('📊 Organization members:', organization?.members);
    
    // Fix: Get member count from organization's members array - count unique, active members only
    let totalMembers = 0;
    if (organization && organization.members) {
      // Create a Set to track unique user IDs
      const uniqueUserIds = new Set();
      
      organization.members.forEach(member => {
        // Ensure member has a valid user ID
        if (member.user && member.user.toString()) {
          uniqueUserIds.add(member.user.toString());
        }
      });
      
      totalMembers = uniqueUserIds.size;
      console.log('📊 Unique member IDs:', Array.from(uniqueUserIds));
      console.log('📊 Total members calculated:', totalMembers);
    }
    
    const stats = {
      totalProjects,
      activeProjects,
      totalHours: totalHours[0]?.total || 0,
      totalMembers
    };
    
    console.log('📊 Final stats:', stats);
    
    res.json({
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
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
    const [totalHours, activeProjects, completedProjects, hourLogs, projects, organization] = await Promise.all([
      HourLog.aggregate([
        { $match: { organization: orgId } },
        { $group: { _id: null, total: { $sum: '$hours' } } }
      ]),
      Project.countDocuments({ organization: orgId, status: 'active' }),
      Project.countDocuments({ organization: orgId, status: 'completed' }),
      HourLog.find({ 
        organization: orgId,
        date: { $gte: startDate.toISOString().split('T')[0] }
      }).sort({ date: 1 }),
      Project.find({ organization: orgId }).sort({ createdAt: -1 }),
      Organization.findById(orgId).populate('members.user', 'name email')
    ]);
    
    // Fix: Get member count from organization's members array - count unique, active members only
    let totalMembers = 0;
    if (organization && organization.members) {
      // Create a Set to track unique user IDs
      const uniqueUserIds = new Set();
      
      organization.members.forEach(member => {
        // Ensure member has a valid user ID
        if (member.user && member.user.toString()) {
          uniqueUserIds.add(member.user.toString());
        }
      });
      
      totalMembers = uniqueUserIds.size;
    }
    
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
        // Check if user is in organization's members array
        const isInOrgMembers = organization.members.some(member => 
          member.user.toString() === user._id.toString()
        );
        
        if (!isInOrgMembers) {
          // Add user to organization's members array
          organization.members.push({
            user: user._id,
            role: userOrg.role || 'member'
          });
          await organization.save();
          fixedOrgs.push({ orgId: organization._id, action: 'added_to_org' });
        }
      } else {
        // Organization doesn't exist, remove from user's organizations
        await User.findByIdAndUpdate(user._id, {
          $pull: { organizations: { organizationId: userOrg.organizationId } }
        });
        fixedOrgs.push({ orgId: userOrg.organizationId, action: 'removed_nonexistent' });
      }
    }
    
    // Check if user is in any organization's members array but not in user's organizations
    const allOrgs = await Organization.find({
      'members.user': user._id
    });
    
    for (const org of allOrgs) {
      const isInUserOrgs = user.organizations.some(userOrg => 
        userOrg.organizationId.toString() === org._id.toString()
      );
      
      if (!isInUserOrgs) {
        // Add organization to user's organizations array
        await User.findByIdAndUpdate(user._id, {
          $push: {
            organizations: {
              organizationId: org._id,
              role: org.members.find(m => m.user.toString() === user._id.toString())?.role || 'member'
            }
          }
        });
        fixedOrgs.push({ orgId: org._id, action: 'added_to_user' });
      }
    }
    
    res.json({ 
      message: 'Organization data fixed', 
      fixedOrgs,
      totalFixed: fixedOrgs.length 
    });
  } catch (error) {
    console.error('Fix organizations error:', error);
    res.status(500).json({ error: 'Failed to fix organizations' });
  }
});

// Debug endpoint to check organization data
app.get('/api/debug/organization/:orgId', authenticateToken, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const organization = await Organization.findById(orgId).populate('members.user', 'name email');
    const usersInOrg = await User.find({ 'organizations.organizationId': orgId }, 'name email');
    
    res.json({
      organization: {
        _id: organization._id,
        name: organization.name,
        membersCount: organization.members.length,
        members: organization.members
      },
      usersInOrg: {
        count: usersInOrg.length,
        users: usersInOrg
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to debug organization' });
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

// Working API endpoint to handle frontend requests
app.get('/api/working', authenticateToken, async (req, res) => {
  try {
    const { action, organizationId } = req.query;
    const userId = req.user.userId;
    
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      console.error('❌ Invalid user ID from token:', userId);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentOrgId = organizationId || user.currentOrganization;
    
    console.log('🔧 Working API called:', action, 'for org:', currentOrgId, 'user:', userId);
    
    switch (action) {
      case 'organizations':
        // Get user's organizations
        const userOrgs = await Organization.find({
          'members.user': userId
        });
        
        const transformedOrgs = userOrgs.map(org => {
          const userMember = org.members.find(member => 
            member.user.toString() === userId.toString()
          );
          
          return {
            _id: org._id,
            organizationId: org._id,
            organization: {
              _id: org._id,
              name: org.name,
              description: org.description || '',
              joinCode: org.joinCode,
              location: org.location || '',
              website: org.website || '',
              category: org.category || '',
              createdAt: org.createdAt,
              members: org.members || []
            },
            role: userMember?.role || 'member',
            joinedAt: userMember?.joinedAt || org.createdAt
          };
        });
        
        return res.json({ success: true, organizations: transformedOrgs });
        
      case 'get-stats':
        // Get stats for current organization
        const org = await Organization.findById(currentOrgId);
        if (!org) {
          return res.json({ success: true, stats: { totalMembers: 0, totalHours: 0, activeProjects: 0, completedTasks: 0 } });
        }
        
        const [totalProjects, activeProjects, totalHours] = await Promise.all([
          Project.countDocuments({ organization: currentOrgId }),
          Project.countDocuments({ organization: currentOrgId, status: 'active' }),
          HourLog.aggregate([
            { $match: { organization: currentOrgId } },
            { $group: { _id: null, total: { $sum: '$hours' } } }
          ])
        ]);
        
        // Count unique members
        const uniqueUserIds = new Set();
        org.members.forEach(member => {
          if (member.user && member.user.toString()) {
            uniqueUserIds.add(member.user.toString());
          }
        });
        
        const stats = {
          totalMembers: uniqueUserIds.size,
          totalHours: totalHours[0]?.total || 0,
          activeProjects,
          completedTasks: totalProjects - activeProjects
        };
        
        return res.json({ success: true, stats });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Working API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Working API POST endpoint for hours logging
app.post('/api/working', authenticateToken, async (req, res) => {
  try {
    const { action } = req.query;
    const userId = req.user.userId;
    
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      console.error('❌ Invalid user ID from token:', userId);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentOrgId = req.body.organizationId || user.currentOrganization;
    
    console.log('🔧 Working API POST called:', action, 'for org:', currentOrgId, 'user:', userId);
    
    switch (action) {
      case 'log-hours':
        const { hours, description, date } = req.body;
        
        if (!hours || !description || !date) {
          return res.status(400).json({ error: 'Hours, description, and date are required' });
        }
        
        const hourLog = new HourLog({
          user: userId,
          organization: currentOrgId,
          hours: parseFloat(hours),
          description,
          date: new Date(date),
          category: 'volunteer'
        });
        
        await hourLog.save();
        
        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.hoursVolunteered': hourLog.hours }
        });
        
        return res.json({ success: true, hourLog });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Working API POST error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Foundly server running at http://localhost:${PORT}`);
});
