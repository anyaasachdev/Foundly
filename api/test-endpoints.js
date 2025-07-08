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

  const action = req.query.action || req.body.action || 'test';
  
  console.log('Test endpoint called with action:', action);
  console.log('Request method:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);

  if (action === 'create-announcement') {
    return res.status(200).json({ 
      success: true, 
      message: 'Test announcement created',
      data: req.body
    });
  }
  
  if (action === 'log-hours') {
    return res.status(200).json({ 
      success: true, 
      message: 'Test hours logged',
      data: req.body
    });
  }
  
  if (action === 'create-project') {
    return res.status(200).json({ 
      success: true, 
      message: 'Test project created',
      data: req.body
    });
  }
  
  if (action === 'create-event') {
    return res.status(200).json({ 
      success: true, 
      message: 'Test event created',
      data: req.body
    });
  }

  return res.status(200).json({ 
    message: 'Test endpoint working',
    action: action,
    method: req.method,
    body: req.body,
    query: req.query
  });
}; 