import mongoose from 'mongoose';

// Test auth endpoint with database connection check
// Updated to trigger redeploy with new environment variables
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Test database connection
    let dbStatus = 'Not connected';
    try {
      if (mongoose.connections[0].readyState) {
        dbStatus = 'Connected';
      } else {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundly', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        dbStatus = 'Connected successfully';
      }
    } catch (dbError) {
      dbStatus = `Connection failed: ${dbError.message}`;
    }

    // Test environment variables
    const envVars = {
      MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };

    res.status(200).json({
      message: 'Auth test endpoint',
      timestamp: new Date().toISOString(),
      method: req.method,
      body: req.body,
      database: dbStatus,
      environment: envVars,
      headers: req.headers
    });

  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    });
  }
} 