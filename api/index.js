const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Models
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  currentOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  organizations: [{
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  refreshToken: String
}));

const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  joinCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}));

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) return;
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
    throw error;
  }
};

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
    
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const path = pathname.replace('/api', '');
    
    console.log('API Request:', { method: req.method, path, body: req.body });
    
    // Auth routes
    if (path === '/auth/register' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({ email, password: hashedPassword, name });
      await user.save();
      
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      return res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organizations: []
        }
      });
    }
    
    if (path === '/auth/login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          organizations: user.organizations || []
        }
      });
    }
    
    // Organizations routes
    if (path === '/organizations' && req.method === 'GET') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId).populate('organizations.organizationId');
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        const organizations = user.organizations || [];
        
        return res.status(200).json({
          organizations: organizations.map(org => ({
            id: org.organizationId?._id || org.organizationId,
            name: org.organizationId?.name || 'Unknown',
            description: org.organizationId?.description || '',
            role: org.role,
            joinedAt: org.joinedAt
          }))
        });
      } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }
    
    if (path === '/organizations' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        const { name, description, customJoinCode } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'Organization name is required' });
        }
        
        const joinCode = customJoinCode || Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const organization = new Organization({
          name,
          description,
          joinCode,
          createdBy: user._id,
          members: [{ userId: user._id, role: 'admin' }]
        });
        
        await organization.save();
        
        // Add to user's organizations
        user.organizations.push({
          organizationId: organization._id,
          role: 'admin'
        });
        await user.save();
        
        return res.status(201).json({
          message: 'Organization created successfully',
          organization: {
            id: organization._id,
            name: organization.name,
            description: organization.description,
            joinCode: organization.joinCode
          }
        });
      } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }
    
    // Health check
    if (path === '/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
    // Default response
    return res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 