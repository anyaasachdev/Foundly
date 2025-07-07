import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import models
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

const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  joinCode: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
        // Get user's organizations
        const user = await User.findById(req.user.userId)
          .populate({
            path: 'organizations.organizationId',
            select: 'name description category joinCode createdBy'
          });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const organizations = user.organizations
          .filter(org => org.isActive)
          .map(org => ({
            _id: org.organizationId._id,
            name: org.organizationId.name,
            description: org.organizationId.description,
            category: org.organizationId.category,
            joinCode: org.organizationId.joinCode,
            role: org.role,
            joinedAt: org.joinedAt,
            isCurrent: user.currentOrganization && user.currentOrganization.equals(org.organizationId._id)
          }));

        res.json({ 
          success: true, 
          organizations,
          currentOrganization: user.currentOrganization
        });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Organizations/my API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 