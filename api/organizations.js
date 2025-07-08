const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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

module.exports = async function handler(req, res) {
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

    switch (true) {
      // POST /organizations/join
      case req.method === 'POST' && req.url.endsWith('/join'):
        {
          const { joinCode } = req.body;
          if (!joinCode || !joinCode.trim()) {
            return res.status(400).json({ error: 'Join code is required' });
          }
          const trimmedJoinCode = joinCode.trim().toUpperCase();
          const organization = await Organization.findOne({ joinCode: trimmedJoinCode });
          if (!organization) {
            return res.status(404).json({ error: 'Invalid join code. Please verify with your organization admin.' });
          }
          const decodedUser = req.user;
          // Check if user is already a member in the organization
          const isInOrgMembers = organization.members.some(member => 
            member.user.toString() === decodedUser.userId.toString()
          );
          // Check if user has the organization in their organizations array
          const user = await User.findById(decodedUser.userId);
          const isInUserOrgs = user.organizations.some(org => 
            org.organizationId.toString() === organization._id.toString()
          );
          // If user is in org members but not in user orgs (data inconsistency), fix it
          if (isInOrgMembers && !isInUserOrgs) {
            await User.findByIdAndUpdate(decodedUser.userId, {
              $push: {
                organizations: {
                  organizationId: organization._id,
                  role: 'member'
                }
              },
              currentOrganization: organization._id
            });
            return res.json({ 
              message: 'Organization membership restored', 
              organization,
              wasInconsistent: true 
            });
          }
          // If user is already a member in both places
          if (isInOrgMembers && isInUserOrgs) {
            return res.json({ 
              message: 'You are already a member of this organization',
              organization: organization,
              alreadyMember: true
            });
          }
          // If user is not a member anywhere, add them
          if (!isInOrgMembers && !isInUserOrgs) {
            // Add user to organization
            organization.members.push({
              user: decodedUser.userId,
              role: 'member'
            });
            await organization.save();
            // Add organization to user
            await User.findByIdAndUpdate(decodedUser.userId, {
              $push: {
                organizations: {
                  organizationId: organization._id,
                  role: 'member'
                }
              },
              currentOrganization: organization._id
            });
            res.json({ message: 'Successfully joined organization', organization });
          }
          break;
        }
      // GET /organizations/my
      case req.method === 'GET' && req.url.endsWith('/my'):
        {
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
        }
      // POST /organizations (create organization)
      case req.method === 'POST' && req.url === '/api/organizations':
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