import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import models
const Announcement = mongoose.model('Announcement', new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  currentOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }
}));

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    // Apply authentication to all routes except OPTIONS
    if (req.method !== 'OPTIONS') {
      authenticateToken(req, res, () => {});
    }

    switch (req.method) {
      case 'GET':
        // Get announcements for user's organization
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.currentOrganization) {
          return res.json({ success: true, announcements: [] });
        }

        const announcements = await Announcement.find({ 
          organization: user.currentOrganization,
          isActive: true 
        })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);

        res.json({ 
          success: true, 
          announcements 
        });
        break;

      case 'POST':
        // Create a new announcement
        const { title, content, priority } = req.body;
        
        const announcement = new Announcement({
          title,
          content,
          priority: priority || 'medium',
          organization: user.currentOrganization,
          createdBy: req.user.userId
        });

        await announcement.save();
        await announcement.populate('createdBy', 'name email');

        res.status(201).json({ 
          success: true, 
          announcement 
        });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Announcements API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 