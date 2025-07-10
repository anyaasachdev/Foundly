import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

let client;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db('foundly');
}

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No token provided');
  }
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Handle different JWT token structures
  let userId = decoded.userId || decoded.user?.id || decoded.id;
  
  // If userId is still a JWT token (contains dots), extract the actual user ID
  if (userId && typeof userId === 'string' && userId.includes('.')) {
    try {
      const tokenParts = userId.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        userId = payload.userId || payload.user?.id || payload.id;
      }
    } catch (e) {
      console.error('Failed to parse JWT token:', e);
    }
  }
  
  // Convert userId to ObjectId if it's a string and looks like an ObjectId
  if (userId && typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
    decoded.userId = new ObjectId(userId);
  } else {
    decoded.userId = userId;
  }
  
  return decoded;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    console.log('Working endpoint called:', req.method, action);

    switch (action) {
      case 'projects':
        return await handleProjects(req, res);
      case 'events':
        return await handleEvents(req, res);
      case 'hours':
        return await handleHours(req, res);
      case 'stats':
        return await handleStats(req, res);
      case 'announcements':
        return await handleAnnouncements(req, res);
      case 'organizations':
        return await handleOrganizations(req, res);
      case 'test':
        return res.status(200).json({ success: true, message: 'Working endpoint is functional' });
      case 'get-stats':
        return await handleGetStats(req, res);
      case 'log-hours':
        return await handleLogHours(req, res);
      case 'get-hours':
        return await handleGetHours(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Working endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Projects handlers
async function handleProjects(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const projects = db.collection('projects');

  switch (req.method) {
    case 'GET':
      const userProjects = await projects.find({ 
        $or: [
          { createdBy: decoded.userId },
          { 'members.userId': decoded.userId }
        ]
      }).toArray();
      return res.status(200).json({ success: true, projects: userProjects });

    case 'POST':
      const { name, description, startDate, endDate, status } = req.body;
      const newProject = {
        name,
        description: description || '',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'active',
        createdBy: decoded.userId,
        createdAt: new Date(),
        members: [{ userId: decoded.userId, role: 'admin' }]
      };
      const result = await projects.insertOne(newProject);
      return res.status(201).json({ 
        success: true, 
        project: { ...newProject, _id: result.insertedId } 
      });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Events handlers
async function handleEvents(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const events = db.collection('events');

  switch (req.method) {
    case 'GET':
      const userEvents = await events.find({ 
        $or: [
          { createdBy: decoded.userId },
          { 'attendees.userId': decoded.userId }
        ]
      }).toArray();
      return res.status(200).json({ success: true, events: userEvents });

    case 'POST':
      const { title, description, startDate, endDate, location } = req.body;
      const newEvent = {
        title,
        description: description || '',
        startTime: new Date(startDate),
        endTime: new Date(endDate),
        location: location || '',
        createdBy: decoded.userId,
        createdAt: new Date(),
        attendees: [{ userId: decoded.userId, status: 'confirmed' }]
      };
      const result = await events.insertOne(newEvent);
      return res.status(201).json({ 
        success: true, 
        event: { ...newEvent, _id: result.insertedId } 
      });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Hours handlers
async function handleHours(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const hours = db.collection('hours');

  switch (req.method) {
    case 'GET':
      const userHours = await hours.find({ userId: decoded.userId })
        .sort({ date: -1 })
        .toArray();
      return res.status(200).json({ success: true, hours: userHours });

    case 'POST':
      const { date, hours: hoursWorked, description, projectId } = req.body;
      const newHours = {
        userId: decoded.userId,
        date: new Date(date),
        hours: parseFloat(hoursWorked),
        description: description || '',
        projectId: projectId || null,
        createdAt: new Date()
      };
      const result = await hours.insertOne(newHours);
      return res.status(201).json({ 
        success: true, 
        hours: { ...newHours, _id: result.insertedId } 
      });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Stats handlers
async function handleStats(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const hours = db.collection('hours');
  const projects = db.collection('projects');
  const events = db.collection('events');

  try {
    // Get total hours worked
    const totalHours = await hours.aggregate([
      { $match: { userId: decoded.userId } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]).toArray();

    // Get hours by month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyHours = await hours.aggregate([
      { 
        $match: { 
          userId: decoded.userId,
          date: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]).toArray();

    // Get project count
    const projectCount = await projects.countDocuments({
      $or: [
        { createdBy: decoded.userId },
        { 'members.userId': decoded.userId }
      ]
    });

    // Get event count
    const eventCount = await events.countDocuments({
      $or: [
        { createdBy: decoded.userId },
        { 'attendees.userId': decoded.userId }
      ]
    });

    const stats = {
      totalHours: totalHours[0]?.total || 0,
      monthlyHours: monthlyHours[0]?.total || 0,
      projectCount,
      eventCount,
      averageHoursPerDay: totalHours[0]?.total ? (totalHours[0].total / 30) : 0
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Announcements handlers
async function handleAnnouncements(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const announcements = db.collection('announcements');

  switch (req.method) {
    case 'GET':
      const userAnnouncements = await announcements.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      return res.status(200).json({ success: true, announcements: userAnnouncements });

    case 'POST':
      const { title, content, priority } = req.body;
      const newAnnouncement = {
        title,
        content,
        priority: priority || 'normal',
        createdBy: decoded.userId,
        createdAt: new Date(),
        readBy: []
      };
      const result = await announcements.insertOne(newAnnouncement);
      return res.status(201).json({ 
        success: true, 
        announcement: { ...newAnnouncement, _id: result.insertedId } 
      });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Organizations handlers
async function handleOrganizations(req, res) {
  const decoded = verifyToken(req);
  const db = await connectDB();
  const organizations = db.collection('organizations');

  switch (req.method) {
    case 'GET':
      // Get user's organizations
      const userOrgs = await organizations.find({
        'members.userId': decoded.userId
      }).toArray();
      return res.status(200).json({ success: true, organizations: userOrgs });

    case 'POST':
      const { name, description, inviteCode } = req.body;
      
      // Check if organization with this invite code already exists
      if (inviteCode) {
        const existingOrg = await organizations.findOne({ inviteCode });
        if (existingOrg) {
          // Join existing organization
          await organizations.updateOne(
            { _id: existingOrg._id },
            { $push: { members: { userId: decoded.userId, role: 'member' } } }
          );
          return res.status(200).json({ 
            success: true, 
            organization: existingOrg,
            type: 'joined'
          });
        }
      }

      // Create new organization
      const newOrg = {
        name,
        description: description || '',
        inviteCode: inviteCode || generateInviteCode(),
        createdBy: decoded.userId,
        createdAt: new Date(),
        members: [{ userId: decoded.userId, role: 'admin' }]
      };
      
      const result = await organizations.insertOne(newOrg);
      return res.status(201).json({ 
        success: true, 
        organization: { ...newOrg, _id: result.insertedId },
        type: 'created'
      });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Stats handler with organization context
async function handleGetStats(req, res) {
  const decoded = verifyToken(req);
  const organizationId = req.query.organizationId || 'default';
  
  try {
    // Get all models
    const HourLog = getModel('HourLog', new mongoose.Schema({
      hours: Number,
      description: String,
      date: Date,
      organizationId: String,
      userId: String,
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
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
      }],
      createdAt: { type: Date, default: Date.now }
    }));
    
    // Get data from all sources
    const [hourLogs, projects, organization, userOrganizations] = await Promise.all([
      HourLog.find({ organizationId }),
      Project.find({ organizationId }),
      Organization.findById(organizationId).catch(() => null),
      // Get all organizations the user is part of
      Organization.find({
        'members.user': decoded.userId.toString()
      }).catch(() => [])
    ]);
    
    // Calculate stats
    const totalHours = hourLogs.reduce((sum, log) => sum + log.hours, 0);
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedTasks = projects.filter(p => p.status === 'completed').length;
    
    // Fix: Get member count from organization's members array - count unique, active members only
    const uniqueActiveMembers = (organization?.members || [])
      .filter((member, index, arr) => {
        // Ensure member has a valid user ID
        if (!member.user) return false;
        
        // Check if this is the first occurrence of this user ID (remove duplicates)
        const firstIndex = arr.findIndex(m => m.user.toString() === member.user.toString());
        if (firstIndex !== index) return false;
        
        // Check if member is active
        if (member.hasOwnProperty('isActive') && member.isActive === false) return false;
        
        return true;
      });
    
    const totalMembers = uniqueActiveMembers.length || 0;
    const totalOrganizations = userOrganizations.length || 0;
    
    console.log(`Stats for org ${organizationId}:`, {
      totalHours,
      activeProjects,
      completedTasks,
      totalMembers,
      totalProjects: projects.length,
      totalOrganizations
    });

    return res.status(200).json({ 
      success: true, 
      stats: {
        totalHours,
        activeProjects,
        completedTasks,
        totalMembers,
        totalProjects: projects.length,
        totalOrganizations
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Hours logging handler
async function handleLogHours(req, res) {
  const decoded = verifyToken(req);
  
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
      userId: { type: String, required: true },
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
      organizationId: organizationId || 'default',
      userId: decoded.userId
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

// Get hours handler
async function handleGetHours(req, res) {
  const decoded = verifyToken(req);
  const organizationId = req.query.organizationId || 'default';
  
  try {
    const HourLog = getModel('HourLog', new mongoose.Schema({
      hours: Number,
      description: String,
      date: Date,
      organizationId: String,
      userId: String,
      createdAt: { type: Date, default: Date.now }
    }));
    
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
  } catch (error) {
    console.error('Get hours error:', error);
    return res.status(500).json({ error: 'Failed to fetch hours' });
  }
} 