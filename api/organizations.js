import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import models
const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  location: String,
  website: String,
  category: {
    type: String,
    enum: ['community', 'environment', 'education', 'health', 'arts', 'technology'],
    default: 'community'
  },
  joinCode: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verified: {
    type: Boolean,
    default: false
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
  },
  organizations: [{
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }]
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
      case 'POST':
        // Create a new organization
        const { name, description, category, location, website, customJoinCode } = req.body;
        
        const organization = new Organization({
          name,
          description,
          category,
          location,
          website,
          joinCode: customJoinCode, // Use the custom join code
          createdBy: req.user.userId,
          admins: [req.user.userId],
          members: [{
            user: req.user.userId,
            role: 'admin',
            joinedAt: new Date()
          }]
        });

        await organization.save();

        // Update user's organizations and set as current
        const user = await User.findById(req.user.userId);
        user.organizations.push({
          organizationId: organization._id,
          role: 'admin',
          joinedAt: new Date(),
          isActive: true
        });
        user.currentOrganization = organization._id;
        await user.save();

        res.status(201).json({ 
          success: true, 
          organization,
          message: 'Organization created successfully'
        });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Organizations API error:', error);
    if (
      error.message &&
      error.message.toLowerCase().includes('already a member')
    ) {
      // Try to fetch orgs and redirect
      try {
        const orgs = await ApiService.getMyOrganizations();
        if (orgs && orgs.length > 0) {
          res.status(200).json({
            success: true,
            organization: orgs[0].organizationId || orgs[0]
          });
          return;
        }
      } catch (fetchError) {
        // fallback to error message
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
} 