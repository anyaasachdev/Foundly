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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await connectDB();
    
    // Authenticate the user
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    let decodedUser;
    try {
      decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    console.log('Join request body:', req.body);
    console.log('Decoded user:', decodedUser);
    
    const { joinCode } = req.body;
    console.log('Received joinCode:', joinCode);
    
    if (!joinCode || !joinCode.trim()) {
      console.log('Join code is missing or empty');
      return res.status(400).json({ error: 'Join code is required' });
    }
    
    const trimmedJoinCode = joinCode.trim().toUpperCase();
    console.log('Looking for organization with joinCode:', trimmedJoinCode);
    
    const organization = await Organization.findOne({ joinCode: trimmedJoinCode });
    console.log('Found organization:', organization ? organization.name : 'Not found');
    
    if (!organization) {
      return res.status(404).json({ error: 'Invalid join code. Please verify with your organization admin.' });
    }
    // Check if user is already a member in the organization
    const isInOrgMembers = organization.members.some(member => 
      member.user.toString() === decodedUser.userId.toString()
    );
    console.log('User in org members:', isInOrgMembers);
    
    // Check if user has the organization in their organizations array
    const user = await User.findById(decodedUser.userId);
    const isInUserOrgs = user.organizations.some(org => 
      org.organizationId.toString() === organization._id.toString()
    );
    console.log('User in user orgs:', isInUserOrgs);
    console.log('User organizations:', user.organizations);
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
      console.log('User is already a member, returning organization info');
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
  } catch (error) {
    console.error('Join organization error:', error);
    res.status(500).json({ error: 'Failed to join organization' });
  }
} 