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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
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
          console.log('Creating event with data:', req.body);
          console.log('User current organization:', createUser.currentOrganization);
          
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
            // If only end date is provided, use start time
            endDateTime = new Date(`${endDate}T${startTime}`);
          } else {
            // If no end date/time, use start date/time + 1 hour
            endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
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
            attendees: attendees ? attendees.map(email => ({ user: email, status: 'pending' })) : [],
            reminder: reminder || 15,
            recurring: recurring || 'none',
            color: color || '#667eea'
          });
          
          await event.save();
          await event.populate('createdBy', 'name email');
          
          console.log('Event created successfully:', event);
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