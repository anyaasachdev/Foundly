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
  // Convert userId to ObjectId if it's a string
  if (decoded.userId && typeof decoded.userId === 'string') {
    decoded.userId = new ObjectId(decoded.userId);
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