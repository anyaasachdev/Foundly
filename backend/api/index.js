// Simple test endpoint
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Foundly Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    method: req.method,
    url: req.url
  });
} 