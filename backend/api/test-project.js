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
  }
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

const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String
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

    // Test project creation with hardcoded data
    const testProject = new Project({
      title: 'Test Project',
      description: 'This is a test project',
      organization: '507f1f77bcf86cd799439011', // Test ObjectId
      createdBy: '507f1f77bcf86cd799439012', // Test ObjectId
      status: 'active',
      priority: 'medium',
      category: 'community',
      dueDate: new Date(),
      progress: 0
    });

    const savedProject = await testProject.save();
    
    res.status(200).json({
      message: 'Test project created successfully',
      project: savedProject,
      timestamp: new Date().toISOString(),
      environment: {
        has_mongodb_uri: !!process.env.MONGODB_URI,
        has_jwt_secret: !!process.env.JWT_SECRET,
        connection_state: mongoose.connection.readyState
      }
    });

  } catch (error) {
    console.error('Test project error:', error);
    res.status(500).json({
      message: 'Test project creation failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: {
        has_mongodb_uri: !!process.env.MONGODB_URI,
        has_jwt_secret: !!process.env.JWT_SECRET,
        connection_state: mongoose.connection.readyState
      }
    });
  }
} 