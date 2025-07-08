import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Define User model inline
const User = mongoose.model('User', new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: '👤'
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
  }],
  currentOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  profile: {
    bio: String,
    skills: [String],
    interests: [String],
    socialLinks: {
      linkedin: String,
      twitter: String,
      website: String
    }
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  gsp: {
    type: Number,
    default: 0
  },
  badges: [{
    name: String,
    icon: String,
    earnedAt: Date
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  stats: {
    projectsCompleted: { type: Number, default: 0 },
    hoursVolunteered: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 }
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  refreshToken: String,
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
}));

// Add methods to User model
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  await connectDB();
  const action = req.query.action || req.body.action || 'login';
  try {
    if (action === 'login' && req.method === 'POST') {
      // --- Begin login.js logic ---
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const users = await User.find({ email }).populate('currentOrganization');
      if (!users || users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      let user = null;
      for (const potentialUser of users) {
        if (await potentialUser.comparePassword(password)) {
          user = potentialUser;
          break;
        }
      }
      if (!user) {
        if (users.length > 0) {
          await users[0].incLoginAttempts();
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.isLocked()) {
        return res.status(423).json({ error: 'Account temporarily locked due to too many failed login attempts' });
      }
      if (user.loginAttempts > 0) {
        await user.updateOne({
          $unset: { loginAttempts: 1, lockUntil: 1 },
          $set: { lastLogin: new Date() }
        });
      }
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
      );
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
      // --- End login.js logic ---
    } else if (action === 'register' && req.method === 'POST') {
      // --- Begin register.js logic ---
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }
      const user = new User({ email, password, name });
      await user.save();
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
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
      // --- End register.js logic ---
    } else if (action === 'refresh' && req.method === 'POST') {
      // --- Begin refresh.js logic ---
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
      if (decoded.type !== 'refresh') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const newRefreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
      );
      user.refreshToken = newRefreshToken;
      await user.save();
      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken
      });
      // --- End refresh.js logic ---
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 