const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /script/i, /javascript/i, /vbscript/i,
    /onload/i, /onerror/i, /onclick/i,
    /<.*>/i, /union.*select/i, /drop.*table/i
  ];
  
  const requestData = JSON.stringify(req.body);
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));
  
  if (isSuspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST from ${req.ip}:`, {
      method: req.method,
      url: req.url,
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = securityLogger;