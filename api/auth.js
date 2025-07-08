const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple User model - Updated for new MongoDB connection
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

// Simple Organization model
const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  joinCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }]
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
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
    throw error;
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
    // Test database connection first
    await connectDB();
    
    const action = req.query.action || req.body.action || 'login';
    
    if (action === 'test') {
      // Simple test endpoint to check if everything is working
      return res.status(200).json({ 
        message: 'Auth API is working',
        database: 'Connected',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find user by email with timeout
      const user = await User.findOne({ email }).maxTimeMS(5000);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      // Update user
      user.refreshToken = refreshToken;
      await user.save();
      
      return res.status(200).json({
        message: 'Login successful',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          currentOrganization: user.currentOrganization,
          organizations: user.organizations
        }
      });
      
    } else if (action === 'register' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email }).maxTimeMS(5000);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        name
      });
      
      await user.save();
      
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '15m' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      user.refreshToken = refreshToken;
      await user.save();
      
      return res.status(201).json({
        message: 'User created successfully',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
      
    } else if (action === 'refresh' && req.method === 'POST') {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret');
        
        if (decoded.type !== 'refresh') {
          return res.status(403).json({ error: 'Invalid token type' });
        }
        
        const user = await User.findById(decoded.userId).maxTimeMS(5000);
        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }
        
        const accessToken = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '15m' }
        );
        
        const newRefreshToken = jwt.sign(
          { userId: user._id, type: 'refresh' },
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '7d' }
        );
        
        user.refreshToken = newRefreshToken;
        await user.save();
        
        return res.status(200).json({
          accessToken,
          refreshToken: newRefreshToken
        });
        
      } catch (error) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Auth API error:', error);
    
    // Check if it's a database connection error
    if (error.message.includes('MONGODB_URI') || error.message.includes('timed out') || error.message.includes('buffering')) {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: 'Please check your MONGODB_URI environment variable in Vercel',
        message: error.message
      });
    }
    
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}; 