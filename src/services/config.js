// Configuration for API endpoints
const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    console.log('🔧 Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // In production, use the same domain for API calls
  if (process.env.NODE_ENV === 'production') {
    const currentUrl = window.location.origin;
    console.log('🔧 Using production URL:', `${currentUrl}/api`);
    return `${currentUrl}/api`;
  }
  
  // In development, use localhost
  console.log('🔧 Using development URL: http://localhost:3001/api');
  return 'http://localhost:3001/api';
};

export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🚀 API Config initialized with baseURL:', API_CONFIG.baseURL);

export default API_CONFIG; 