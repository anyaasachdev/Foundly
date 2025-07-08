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

  console.log('=== DEBUG ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);

  const action = req.query.action || req.body.action || 'test';

  if (action === 'create-announcement') {
    console.log('Creating announcement with data:', req.body);
    return res.status(200).json({ 
      success: true, 
      message: 'Debug: Announcement would be created',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (action === 'log-hours') {
    console.log('Logging hours with data:', req.body);
    return res.status(200).json({ 
      success: true, 
      message: 'Debug: Hours would be logged',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (action === 'create-project') {
    console.log('Creating project with data:', req.body);
    return res.status(200).json({ 
      success: true, 
      message: 'Debug: Project would be created',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (action === 'create-event') {
    console.log('Creating event with data:', req.body);
    return res.status(200).json({ 
      success: true, 
      message: 'Debug: Event would be created',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({ 
    message: 'Debug endpoint working',
    action: action,
    method: req.method,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });
}; 