import mongoose from 'mongoose';

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
    // Check environment variables
    const mongoUri = process.env.MONGODB_URI;
    const jwtSecret = process.env.JWT_SECRET;
    
    let dbStatus = 'Not attempted';
    let dbError = null;
    
    // Try to connect to database if URI exists
    if (mongoUri) {
      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
        }
        dbStatus = 'Connected successfully';
      } catch (error) {
        dbStatus = 'Connection failed';
        dbError = error.message;
      }
    } else {
      dbStatus = 'No MONGODB_URI found';
    }

    const response = {
      message: 'Environment Debug',
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
        has_mongodb_uri: !!mongoUri,
        has_jwt_secret: !!jwtSecret,
        mongodb_uri_preview: mongoUri ? `${mongoUri.substring(0, 20)}...` : 'Not set',
        jwt_secret_preview: jwtSecret ? `${jwtSecret.substring(0, 10)}...` : 'Not set'
      },
      database: {
        status: dbStatus,
        error: dbError,
        connection_state: mongoose.connection.readyState
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers
      }
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: 'Debug endpoint error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 