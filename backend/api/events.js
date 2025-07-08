const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../models/User');
const Event = require('../models/Event');

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  await connectDB();

  // Apply authentication to all routes
  authenticateToken(req, res, async () => {
    try {
      switch (req.method) {
        case 'GET':
          // Get all events for the current user's organization
          const user = await User.findById(req.user.userId);
          const events = await Event.find({ organization: user.currentOrganization })
            .populate('createdBy', 'name email')
            .populate('attendees.user', 'name email')
            .sort({ startDate: 1 });
          res.json({ data: events });
          break;

        case 'POST':
          // Create new event
          const createUser = await User.findById(req.user.userId);
          if (!createUser.currentOrganization) {
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
            endDateTime = new Date(`${endDate}T${startTime}`);
          } else {
            endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          }

          // Fix: attendees should be user IDs if possible
          let attendeeObjs = [];
          if (Array.isArray(attendees) && attendees.length > 0) {
            // Try to resolve emails to user IDs
            attendeeObjs = await Promise.all(attendees.map(async (email) => {
              const user = await User.findOne({ email });
              return user ? { user: user._id, status: 'pending' } : null;
            }));
            attendeeObjs = attendeeObjs.filter(Boolean);
          }

          const event = new Event({
            title,
            description,
            organization: createUser.currentOrganization,
            createdBy: req.user.userId,
            startDate: startDateTime,
            endDate: endDateTime,
            type: type || 'meeting',
            location: location || '',
            attendees: attendeeObjs,
            reminder: reminder || 15,
            recurring: recurring || 'none',
            color: color || '#667eea'
          });
          await event.save();
          await event.populate('createdBy', 'name email');
          await event.populate('attendees.user', 'name email');
          res.status(201).json({ data: event });
          break;

        default:
          res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Events API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
} 
