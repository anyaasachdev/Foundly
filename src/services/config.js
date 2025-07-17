// Configuration for API endpoints
const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production, use Vercel URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://foundly-olive.vercel.app/api';
  }
  
  // In development, use localhost
  return 'http://localhost:3001/api';
};

export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

export default API_CONFIG; 