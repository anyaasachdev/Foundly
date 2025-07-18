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
    // Check if MongoDB URI is set
    const hasMongoUri = !!process.env.MONGODB_URI;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      config: {
        hasMongoUri,
        hasJwtSecret,
        nodeVersion: process.version
      },
      message: 'Foundly API is running!'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 