const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate access and refresh tokens (no third-party service)
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' } // Longer-lived refresh token
  );
  
  return { accessToken, refreshToken };
};

// Enhanced authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is not locked
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    
    if (user.isLocked) {
      return res.status(401).json({ message: 'Account is locked due to too many failed login attempts' });
    }
    
    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return res.status(401).json({ message: 'Password recently changed. Please log in again.' });
    }
    
    req.user = decoded;
    req.currentUser = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Refresh token endpoint
const refreshTokens = async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
    
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user._id);
    
    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();
    
    res.json(tokens);
  } catch (err) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

module.exports = {
  generateTokens,
  authenticateToken,
  refreshTokens
};