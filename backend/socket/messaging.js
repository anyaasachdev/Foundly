const socketIo = require('socket.io');
const redis = require('redis');
const jwt = require('jsonwebtoken');

// Redis for message persistence and scaling
const redisClient = redis.createClient();

// Secure socket authentication
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

// Message encryption
const crypto = require('crypto');
const encryptMessage = (text) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.MESSAGE_SECRET);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};