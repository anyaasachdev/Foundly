import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

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
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name required' });
    }

    const db = await connectDB();
    const organizations = db.collection('organizations');
    const users = db.collection('users');

    // Create organization
    const organization = {
      name,
      description: description || '',
      createdAt: new Date(),
      members: [{
        userId: decoded.userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    };

    const orgResult = await organizations.insertOne(organization);
    const newOrg = { ...organization, _id: orgResult.insertedId };

    // Update user with organization
    await users.updateOne(
      { _id: decoded.userId },
      { 
        $push: { 
          organizations: {
            organizationId: newOrg._id,
            role: 'admin'
          }
        }
      }
    );

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

    // Find organization by join code (using name as join code for now)
    const organization = await organizations.findOne({ name: joinCode });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is already a member
    const isMember = organization.members.some(member => member.userId.toString() === decoded.userId.toString());
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this organization' });
    }

    // Add user to organization
    await organizations.updateOne(
      { _id: organization._id },
      { 
        $push: { 
          members: {
            userId: decoded.userId,
            role: 'member',
            joinedAt: new Date()
          }
        }
      }
    );

    // Update user with organization
    await users.updateOne(
      { _id: decoded.userId },
      { 
        $push: { 
          organizations: {
            organizationId: organization._id,
            role: 'member'
          }
        }
      }
    );

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

    // Get user with organizations
    const user = await users.findOne(
      { _id: decoded.userId },
      { projection: { organizations: 1 } }
    );

    if (!user || !user.organizations) {
      return res.status(200).json({ organizations: [] });
    }

    // Get organization details
    const organizations = db.collection('organizations');
    const orgIds = user.organizations.map(org => org.organizationId);
    
    const orgDetails = await organizations.find({ _id: { $in: orgIds } }).toArray();
    
    // Combine user org data with org details
    const userOrgs = user.organizations.map(userOrg => {
      const orgDetail = orgDetails.find(org => org._id.toString() === userOrg.organizationId.toString());
      return {
        ...userOrg,
        organization: orgDetail
      };
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