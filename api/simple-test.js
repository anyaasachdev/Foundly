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
    console.log('Simple test endpoint called');
    
    return res.status(200).json({ 
      message: 'Simple test endpoint is working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query
    });
  } catch (error) {
    console.error('Simple test error:', error);
    return res.status(500).json({ 
      error: 'Simple test failed', 
      details: error.message 
    });
  }
}; 