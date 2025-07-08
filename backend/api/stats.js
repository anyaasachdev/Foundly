const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
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
      if (req.method === 'GET') {
        const user = await User.findById(req.user.userId);
        const orgId = user.currentOrganization;
        
        const [totalProjects, activeProjects, totalHours, organization] = await Promise.all([
          Project.countDocuments({ organization: orgId }),
          Project.countDocuments({ organization: orgId, status: 'active' }),
          HourLog.aggregate([
            { $match: { organization: orgId } },
            { $group: { _id: null, total: { $sum: '$hours' } } }
          ]),
          Organization.findById(orgId)
        ]);
        
        // Fix: Get member count from organization's members array
        const totalMembers = organization?.members?.length || 0;
        
        res.json({
          data: {
            totalProjects,
            activeProjects,
            totalHours: totalHours[0]?.total || 0,
            totalMembers
          }
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Stats API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
} 