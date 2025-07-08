const mongoose = require('mongoose');

// Simple Organization model
const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  description: String,
  joinCode: String,
  createdBy: mongoose.Schema.Types.ObjectId
}));

// Simple User model
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  organizations: [{
    organizationId: mongoose.Schema.Types.ObjectId,
    role: String
  }]
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

module.exports = async function handler(req, res) {
  // Enable CORS
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

    // Test endpoint
    if (req.method === 'GET' && req.url.endsWith('/test')) {
      return res.status(200).json({ message: 'Simple organizations API is working' });
    }

    // Join endpoint
    if (req.method === 'POST' && req.url.endsWith('/join')) {
      const { joinCode } = req.body;
      if (!joinCode) {
        return res.status(400).json({ error: 'Join code is required' });
      }
      
      const organization = await Organization.findOne({ joinCode: joinCode.toUpperCase() });
      if (!organization) {
        return res.status(404).json({ error: 'Invalid join code' });
      }
      
      return res.status(200).json({ 
        message: 'Join endpoint working', 
        organization: { name: organization.name, joinCode: organization.joinCode }
      });
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Simple organizations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 