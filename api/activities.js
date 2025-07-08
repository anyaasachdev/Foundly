const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Event = require('../models/Event');
const HourLog = require('../models/HourLog');

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  await connectDB();
  authenticateToken(req, res, async () => {
    const type = req.query.type || req.body.type || 'event';
    try {
      if (type === 'event') {
        switch (req.method) {
          case 'GET': {
            // Get all events for the current user's organization
            const user = await User.findById(req.user.userId);
            const events = await Event.find({ organization: user.currentOrganization })
              .populate('createdBy', 'name email')
              .populate('attendees.user', 'name email')
              .sort({ startDate: 1 });
            return res.json({ data: events });
          }
          case 'POST': {
            // Create new event
            const createUser = await User.findById(req.user.userId);
            if (!createUser.currentOrganization) {
              return res.status(400).json({ error: 'No organization selected' });
            }
            const { 
              title, description, startDate, endDate, startTime, endTime, type: eventType, location, attendees, reminder, recurring, color 
            } = req.body;
            if (!title || !startDate || !startTime) {
              return res.status(400).json({ error: 'Title, start date, and start time are required' });
            }
            const startDateTime = new Date(`${startDate}T${startTime}`);
            let endDateTime;
            if (endDate && endTime) {
              endDateTime = new Date(`${endDate}T${endTime}`);
            } else if (endDate) {
              endDateTime = new Date(`${endDate}T${startTime}`);
            } else {
              endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            }
            let attendeeObjs = [];
            if (Array.isArray(attendees) && attendees.length > 0) {
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
              type: eventType || 'meeting',
              location: location || '',
              attendees: attendeeObjs,
              reminder: reminder || 15,
              recurring: recurring || 'none',
              color: color || '#667eea'
            });
            await event.save();
            await event.populate('createdBy', 'name email');
            await event.populate('attendees.user', 'name email');
            return res.status(201).json({ data: event });
          }
          default:
            return res.status(405).json({ error: 'Method not allowed' });
        }
      } else if (type === 'hour') {
        switch (req.method) {
          case 'GET': {
            // Get all hours for the current user's organization
            const user = await User.findById(req.user.userId);
            const hours = await HourLog.find({ organization: user.currentOrganization })
              .populate('user', 'name email')
              .populate('project', 'title')
              .sort({ date: -1 });
            return res.json({ data: hours });
          }
          case 'POST': {
            // Log new hours
            const logUser = await User.findById(req.user.userId);
            if (!logUser.currentOrganization) {
              return res.status(400).json({ error: 'No organization selected. Please join or create an organization.' });
            }
            const { hours: hoursValue, description, date, project, category } = req.body;
            if (hoursValue === undefined || hoursValue === null || description === undefined || description === null || !date) {
              return res.status(400).json({ error: 'Hours, description, and date are required.' });
            }
            if (isNaN(hoursValue) || Number(hoursValue) <= 0) {
              return res.status(400).json({ error: 'Hours must be a positive number.' });
            }
            if (typeof description !== 'string' || description.trim().length < 3) {
              return res.status(400).json({ error: 'Description must be at least 3 characters.' });
            }
            const hourLog = new HourLog({
              user: req.user.userId,
              organization: logUser.currentOrganization,
              hours: parseFloat(hoursValue),
              description: description.trim(),
              date: new Date(date),
              project: project || null,
              category: category || 'volunteer'
            });
            await hourLog.save();
            await User.findByIdAndUpdate(req.user.userId, {
              $inc: { 'stats.hoursVolunteered': hourLog.hours }
            });
            await hourLog.populate('user', 'name email');
            return res.status(201).json({ data: hourLog });
          }
          default:
            return res.status(405).json({ error: 'Method not allowed' });
        }
      } else {
        res.status(400).json({ error: 'Invalid type' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
} 