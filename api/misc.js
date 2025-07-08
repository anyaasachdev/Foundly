import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const Announcement = mongoose.model('Announcement', new mongoose.Schema({
  title: String,
  content: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  currentOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  await connectDB();
  const type = req.query.type || req.body.type || 'announcement';
  if (type === 'health') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development' });
  }
  authenticateToken(req, res, async () => {
    try {
      if (type === 'announcement') {
        switch (req.method) {
          case 'GET': {
            // Get announcements for user's organization
            const user = await User.findById(req.user.userId);
            if (!user || !user.currentOrganization) {
              return res.json({ success: true, announcements: [] });
            }
            const announcements = await Announcement.find({ 
              organization: user.currentOrganization,
              isActive: true 
            })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);
            return res.json({ success: true, announcements });
          }
          case 'POST': {
            // Create a new announcement
            const user = await User.findById(req.user.userId);
            const { title, content, priority } = req.body;
            const announcement = new Announcement({
              title,
              content,
              priority: priority || 'medium',
              organization: user.currentOrganization,
              createdBy: req.user.userId
            });
            await announcement.save();
            await announcement.populate('createdBy', 'name email');
            return res.status(201).json({ success: true, announcement });
          }
          default:
            return res.status(405).json({ error: 'Method not allowed' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid type' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
} 