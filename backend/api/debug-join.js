import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  location: String,
  website: String,
  category: String,
  joinCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  verified: { type: Boolean, default: false }
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  currentOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  organizations: [{
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }]
}));

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
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
    authenticateToken(req, res, () => {});

    if (req.method === 'GET') {
      // Show all organizations and their join codes
      const organizations = await Organization.find({}, 'name joinCode members');
      const user = await User.findById(req.user.userId);
      
      return res.json({
        organizations: organizations.map(org => ({
          name: org.name,
          joinCode: org.joinCode,
          memberCount: org.members.length,
          isMember: org.members.some(m => m.user.toString() === req.user.userId)
        })),
        userOrganizations: user.organizations,
        currentUser: {
          id: req.user.userId,
          email: user.email
        }
      });
    }

    if (req.method === 'POST') {
      // Test join with provided code
      const { joinCode } = req.body;
      
      if (!joinCode) {
        return res.status(400).json({ error: 'Join code is required' });
      }

      const organization = await Organization.findOne({ joinCode: joinCode.trim().toUpperCase() });
      
      if (!organization) {
        return res.status(404).json({ 
          error: 'Invalid join code. Please verify with your organization admin.',
          providedCode: joinCode,
          trimmedCode: joinCode.trim().toUpperCase()
        });
      }

      // Check if user is already a member
      const isInOrgMembers = organization.members.some(member => 
        member.user.toString() === req.user.userId.toString()
      );

      const isInUserOrgs = user.organizations.some(org => 
        org.organizationId.toString() === organization._id.toString()
      );

      return res.json({
        organization: {
          name: organization.name,
          joinCode: organization.joinCode,
          id: organization._id
        },
        userStatus: {
          isInOrgMembers,
          isInUserOrgs,
          alreadyMember: isInOrgMembers || isInUserOrgs
        },
        providedCode: joinCode,
        trimmedCode: joinCode.trim().toUpperCase()
      });
    }

  } catch (error) {
    console.error('Debug join error:', error);
    res.status(500).json({ error: 'Failed to debug join', details: error.message });
  }
} 