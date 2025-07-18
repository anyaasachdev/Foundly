const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import simplified models
const User = require('./models/User');
const Organization = require('./models/Organization');
const Project = require('./models/Project');
const Event = require('./models/Event');
const HourLog = require('./models/HourLog');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Simple JWT middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Organization routes
app.post('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const { name, description, customJoinCode } = req.body;
    
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
    
    // Check if join code already exists
    const existingOrg = await Organization.findOne({ joinCode: customJoinCode.toUpperCase() });
    if (existingOrg) {
      return res.status(400).json({ error: 'This join code is already taken. Please choose a different one.' });
    }
    
    const organization = new Organization({
      name,
      description: description || '',
      joinCode: customJoinCode.toUpperCase(),
      createdBy: req.user._id,
      members: [{ user: req.user._id }]
    });
    
    await organization.save();

    // Add organization to user's organizations and set as current
    req.user.organizations.push({ organizationId: organization._id });
    req.user.currentOrganization = organization._id;
    await req.user.save();

    res.status(201).json({
      message: 'Organization created successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        description: organization.description,
        joinCode: organization.joinCode
      }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization: ' + error.message });
  }
});

app.post('/api/organizations/join', authenticateToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    
    const organization = await Organization.findOne({ joinCode });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = organization.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'Already a member of this organization' });
    }

    // Add user to organization
    organization.members.push({ user: req.user._id });
    organization.totalMembers = organization.members.length;
    await organization.save();

    // Add organization to user's organizations and set as current
    req.user.organizations.push({ organizationId: organization._id });
    req.user.currentOrganization = organization._id;
    await req.user.save();

    res.json({
      message: 'Joined organization successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        description: organization.description,
        joinCode: organization.joinCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join organization' });
  }
});

app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('organizations.organizationId');
    
    const organizations = user.organizations.map(org => ({
      id: org.organizationId._id,
      name: org.organizationId.name,
      description: org.organizationId.description,
      joinCode: org.organizationId.joinCode,
      isCurrent: org.organizationId._id.toString() === user.currentOrganization?.toString()
    }));

    res.json({ organizations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

app.put('/api/organizations/switch/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if user is a member of this organization
    const isMember = req.user.organizations.some(org => 
      org.organizationId.toString() === orgId
    );
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    // Switch current organization
    req.user.currentOrganization = orgId;
    await req.user.save();

    res.json({ message: 'Organization switched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch organization' });
  }
});

app.delete('/api/organizations/:orgId/leave', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if user is a member of this organization
    const isMember = req.user.organizations.some(org => 
      org.organizationId.toString() === orgId
    );
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    // Remove user from organization
    const organization = await Organization.findById(orgId);
    if (organization) {
      organization.members = organization.members.filter(member => 
        member.user.toString() !== req.user._id.toString()
      );
      organization.totalMembers = organization.members.length;
      await organization.save();
    }

    // Remove organization from user's organizations
    req.user.organizations = req.user.organizations.filter(org => 
      org.organizationId.toString() !== orgId
    );
    
    // If this was the current organization, clear it
    if (req.user.currentOrganization && req.user.currentOrganization.toString() === orgId) {
      req.user.currentOrganization = null;
    }
    
    await req.user.save();

    res.json({ message: 'Left organization successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave organization' });
  }
});

// Project routes
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    
    if (!req.user.currentOrganization) {
      return res.status(400).json({ error: 'No active organization' });
    }

    const project = new Project({
      title,
      description,
      dueDate,
      organization: req.user.currentOrganization,
      createdBy: req.user._id
    });
    
    await project.save();

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        dueDate: project.dueDate
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    if (!req.user.currentOrganization) {
      return res.json({ projects: [] });
    }

    const projects = await Project.find({ organization: req.user.currentOrganization })
      .populate('createdBy', 'name');

    res.json({
      projects: projects.map(project => ({
        id: project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        dueDate: project.dueDate,
        createdBy: project.createdBy.name
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Event routes
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, date, time } = req.body;
    
    if (!req.user.currentOrganization) {
      return res.status(400).json({ error: 'No active organization' });
    }

    const event = new Event({
      title,
      description,
      date,
      time,
      organization: req.user.currentOrganization,
      createdBy: req.user._id
    });
    
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    if (!req.user.currentOrganization) {
      return res.json({ events: [] });
    }

    const events = await Event.find({ organization: req.user.currentOrganization })
      .populate('createdBy', 'name');

    res.json({
      events: events.map(event => ({
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        createdBy: event.createdBy.name
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Hours logging routes
app.post('/api/hours', authenticateToken, async (req, res) => {
  try {
    const { projectId, hours, description, date } = req.body;
    
    if (!req.user.currentOrganization) {
      return res.status(400).json({ error: 'No active organization' });
    }

    const hourLog = new HourLog({
      user: req.user._id,
      organization: req.user.currentOrganization,
      project: projectId,
      hours,
      description,
      date: date || new Date()
    });
    
    await hourLog.save();

    // Update user's total hours
    req.user.totalHours += hours;
    await req.user.save();

    res.status(201).json({
      message: 'Hours logged successfully',
      hourLog: {
        id: hourLog._id,
        hours: hourLog.hours,
        description: hourLog.description,
        date: hourLog.date
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log hours' });
  }
});

app.get('/api/hours', authenticateToken, async (req, res) => {
  try {
    if (!req.user.currentOrganization) {
      return res.json({ hours: [] });
    }

    const hours = await HourLog.find({ 
      organization: req.user.currentOrganization 
    }).populate('user', 'name').populate('project', 'title');

    res.json({
      hours: hours.map(hour => ({
        id: hour._id,
        hours: hour.hours,
        description: hour.description,
        date: hour.date,
        userName: hour.user.name,
        projectTitle: hour.project?.title || 'General'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hours' });
  }
});

// Stats route
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user.currentOrganization) {
      return res.json({
        totalMembers: 0,
        totalHours: 0,
        activeProjects: 0,
        totalEvents: 0
      });
    }

    const organization = await Organization.findById(req.user.currentOrganization);
    const projects = await Project.find({ organization: req.user.currentOrganization });
    const events = await Event.find({ organization: req.user.currentOrganization });
    const hours = await HourLog.find({ organization: req.user.currentOrganization });

    const totalHours = hours.reduce((sum, hour) => sum + hour.hours, 0);

    res.json({
      totalMembers: organization.totalMembers,
      totalHours,
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalEvents: events.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Foundly API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Foundly server running at http://localhost:${PORT}`);
});
