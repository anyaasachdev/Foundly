const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../models/User');
const HourLog = require('../models/HourLog');

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
          // Get all hours for the current user's organization
          const user = await User.findById(req.user.userId);
          const hours = await HourLog.find({ organization: user.currentOrganization })
            .populate('user', 'name email')
            .populate('project', 'title')
            .sort({ date: -1 });
          res.json({ data: hours });
          break;

        case 'POST':
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
          res.status(201).json({ data: hourLog });
          break;

        default:
          res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Hours API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
