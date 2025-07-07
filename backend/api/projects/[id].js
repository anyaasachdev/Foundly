import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import models
const Project = mongoose.model('Project', new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'on-hold'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['community', 'environment', 'education', 'technology', 'health'],
    default: 'community'
  },
  dueDate: Date,
  tags: [String],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tasks: [{
    title: String,
    completed: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date
  }],
  attachments: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  currentOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }
}));

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    // Apply authentication to all routes except OPTIONS
    if (req.method !== 'OPTIONS') {
      authenticateToken(req, res, () => {});
    }

    const projectId = req.query.id;

    switch (req.method) {
      case 'GET':
        // Get a specific project
        const user = await User.findById(req.user.userId);
        const project = await Project.findOne({ 
          _id: projectId, 
          organization: user.currentOrganization 
        }).populate('createdBy', 'name email').populate('assignedTo', 'name email');
        
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ success: true, project });
        break;

      case 'PUT':
        // Update a project
        const updateUser = await User.findById(req.user.userId);
        const projectToUpdate = await Project.findOne({ 
          _id: projectId, 
          organization: updateUser.currentOrganization 
        });
        
        if (!projectToUpdate) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        // Only allow updating certain fields
        const allowedFields = ['title', 'description', 'status', 'priority', 'category', 'assignedTo', 'dueDate', 'completed', 'progress'];
        for (const key of Object.keys(req.body)) {
          if (allowedFields.includes(key)) {
            projectToUpdate[key] = req.body[key];
          }
        }
        
        await projectToUpdate.save();
        await projectToUpdate.populate('createdBy', 'name email');
        await projectToUpdate.populate('assignedTo', 'name email');
        res.json({ success: true, project: projectToUpdate });
        break;

      case 'DELETE':
        // Delete a project
        const deleteUser = await User.findById(req.user.userId);
        const projectToDelete = await Project.findOne({ 
          _id: projectId, 
          organization: deleteUser.currentOrganization 
        });
        
        if (!projectToDelete) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        await Project.findByIdAndDelete(projectId);
        res.json({ success: true, message: 'Project deleted successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 