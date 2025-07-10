import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

let client;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db('foundly');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    console.log('Auth endpoint called:', req.method, action);

    switch (action) {
      case 'register':
        return await handleRegister(req, res);
      case 'login':
        return await handleLogin(req, res);
      case 'refresh':
        return await handleRefresh(req, res);
      case 'create-org':
        return await handleCreateOrganization(req, res);
      case 'join-org':
        return await handleJoinOrganization(req, res);
      case 'get-orgs':
        return await handleGetOrganizations(req, res);
      case 'test':
        return res.status(200).json({ success: true, message: 'Auth endpoint working' });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auth endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleRegister(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = await connectDB();
  const users = db.collection('users');

  // Check if user already exists
  const existingUser = await users.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = {
    name,
    email,
    password: hashedPassword,
    createdAt: new Date(),
    organizations: []
  };

  const result = await users.insertOne(user);
  const newUser = { ...user, _id: result.insertedId };
  delete newUser.password;

  // Include organizations in the response (empty array for new users)
  newUser.organizations = [];

  // Generate tokens
  const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    success: true,
    user: newUser,
    token,
    refreshToken
  });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const db = await connectDB();
  const users = db.collection('users');
  const organizations = db.collection('organizations');

  // Find user
  const user = await users.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate tokens
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

  // Remove password from response
  const userResponse = { ...user };
  delete userResponse.password;

  // Fetch user's organizations with details
  let userOrganizations = [];
  if (user.organizations  user.organizations.length  0) {
    try {
      console.log('🔍 Fetching organization details for user:', user.email);
      console.log('📊 User has organizations:', user.organizations.length);
      
      // Convert organizationId to ObjectId for database query
      const orgIds = user.organizations.map(org = {
        const orgId = org.organizationId;
        // Handle both string and ObjectId formats
        return typeof orgId === 'string' ? new ObjectId(orgId) : orgId;
      });
      
      console.log('🔎 Looking for organizations with IDs:', orgIds.map(id = id.toString()));
      
      const orgDetails = await organizations.find({ _id: { $in: orgIds } }).toArray();
      console.log('✅ Found organization details:', orgDetails.length);
      
      // Combine user org data with org details
      userOrganizations = user.organizations.map(userOrg = {
        const orgId = userOrg.organizationId;
        const orgIdString = typeof orgId === 'string' ? orgId : orgId.toString();
        
        const orgDetail = orgDetails.find(org = org._id.toString() === orgIdString);
        
        if (!orgDetail) {
          console.warn('⚠️ Organization details not found for ID:', orgIdString);
          return {
            ...userOrg,
            organization: {
              _id: orgId,
              name: 'Organization Not Found',
              description: 'This organization may have been deleted'
            }
          };
        }
        
        return {
          ...userOrg,
          organization: orgDetail
        };
      });
      
      console.log('🎯 Final user organizations:', userOrganizations.length);
    } catch (error) {
      console.error('❌ Error fetching organization details:', error);
      // Fallback: create basic organization objects
      userOrganizations = user.organizations.map(userOrg = ({
        ...userOrg,
        organization: {
          _id: userOrg.organizationId,
          name: 'Organization (Details unavailable)',
          description: 'Unable to fetch organization details'
        }
      }));
    }
  }

  // Include organizations in the response
  userResponse.organizations = userOrganizations;

  res.status(200).json({
    success: true,
    user: userResponse,
    token,
    refreshToken
  });
}

async function handleRefresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const newToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      accessToken: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function handleCreateOrganization(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, description, customJoinCode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name required' });
    }

    const db = await connectDB();
    const organizations = db.collection('organizations');
    const users = db.collection('users');

    // Generate join code if not provided
    const joinCode = customJoinCode || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Check if join code already exists
    const existingOrg = await organizations.findOne({ joinCode });
    if (existingOrg) {
      return res.status(400).json({ error: 'Join code already exists. Please try a different one.' });
    }

    // Create organization
    const organization = {
      name,
      description: description || '',
      joinCode,
      createdAt: new Date(),
      memberCount: 1,
      members: [{
        userId: new ObjectId(decoded.userId),
        role: 'admin',
        joinedAt: new Date()
      }]
    };

    const orgResult = await organizations.insertOne(organization);
    const newOrg = { ...organization, _id: orgResult.insertedId };

    // Update user with organization
    await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $push: { 
          organizations: {
            organizationId: newOrg._id,
            role: 'admin'
          }
        }
      }
    );

    console.log('✅ Organization created:', {
      name: newOrg.name,
      joinCode: newOrg.joinCode,
      memberCount: newOrg.memberCount
    });

    res.status(201).json({
      success: true,
      organization: newOrg,
      type: 'created'
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleJoinOrganization(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ error: 'Join code required' });
    }

    const db = await connectDB();
    const organizations = db.collection('organizations');
    const users = db.collection('users');

    // Find organization by proper join code
    const organization = await organizations.findOne({ joinCode: joinCode.toUpperCase() });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found with that join code' });
    }

    // Check if user is already a member (prevent duplicates)
    const userId = new ObjectId(decoded.userId);
    const isMember = organization.members.some(member => 
      member.userId.toString() === userId.toString()
    );
    
    if (isMember) {
      console.log('⚠️ User already member, returning existing organization');
      return res.status(200).json({
        success: true,
        organization,
        type: 'already_member',
        message: 'You are already a member of this organization'
      });
    }

    // Check if user is already in any organization (optional business rule)
    const user = await users.findOne({ _id: userId });
    const userHasOrganizations = user?.organizations && user.organizations.length > 0;
    
    if (userHasOrganizations) {
      console.log('⚠️ User already has organizations, checking for duplicates');
      const alreadyInThisOrg = user.organizations.some(org => 
        org.organizationId.toString() === organization._id.toString()
      );
      
      if (alreadyInThisOrg) {
        console.log('🚨 DUPLICATE MEMBERSHIP PREVENTED');
        return res.status(200).json({
          success: true,
          organization,
          type: 'already_member',
          message: 'You are already a member of this organization'
        });
      }
    }

    // Add user to organization members list
    await organizations.updateOne(
      { _id: organization._id },
      { 
        $push: { 
          members: {
            userId: userId,
            role: 'member',
            joinedAt: new Date()
          }
        },
        $inc: { memberCount: 1 }
      }
    );

    // Update user with organization
    await users.updateOne(
      { _id: userId },
      { 
        $push: { 
          organizations: {
            organizationId: organization._id,
            role: 'member'
          }
        }
      }
    );

    console.log('✅ User joined organization:', {
      user: decoded.userId,
      organization: organization.name,
      newMemberCount: (organization.memberCount || 0) + 1
    });

    res.status(200).json({
      success: true,
      organization,
      type: 'joined'
    });
  } catch (error) {
    console.error('Join organization error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleGetOrganizations(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await connectDB();
    const users = db.collection('users');
    const organizations = db.collection('organizations');

    // Get user with organizations
    const user = await users.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { organizations: 1, email: 1 } }
    );

    if (!user || !user.organizations || user.organizations.length === 0) {
      console.log('⚠️ No organizations found for user:', user?.email);
      return res.status(200).json({ 
        success: true,
        organizations: [] 
      });
    }

    // Get organization details with member counts
    const orgIds = user.organizations.map(org => org.organizationId);
    
    const orgDetails = await organizations.find({ _id: { $in: orgIds } }).toArray();
    
    // Combine user org data with org details and ensure member counts are accurate
    const userOrgs = user.organizations.map(userOrg => {
      const orgDetail = orgDetails.find(org => org._id.toString() === userOrg.organizationId.toString());
      
      if (!orgDetail) {
        console.log('⚠️ Organization not found for user org:', userOrg.organizationId);
        return null;
      }
      
      // Calculate accurate member count
      const actualMemberCount = orgDetail.members ? orgDetail.members.length : 0;
      
      return {
        ...userOrg,
        organization: {
          ...orgDetail,
          memberCount: actualMemberCount,
          // Ensure the member count reflects the actual members array
          members: orgDetail.members || []
        }
      };
    }).filter(Boolean); // Remove null entries

    console.log('✅ Retrieved organizations for user:', {
      user: user.email,
      organizationCount: userOrgs.length,
      organizations: userOrgs.map(org => ({
        name: org.organization?.name,
        memberCount: org.organization?.memberCount,
        role: org.role
      }))
    });

    res.status(200).json({
      success: true,
      organizations: userOrgs
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: error.message });
  }
}
