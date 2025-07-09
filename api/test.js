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
    console.log('Test endpoint called:', req.method, req.url);
    
    // Test environment variables
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL
    };
    
    return res.status(200).json({ 
      success: true,
      message: 'Test endpoint is working!',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      environment: envInfo,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers['origin']
      }
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
}; 