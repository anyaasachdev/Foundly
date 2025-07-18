const axios = require('axios');

// Test the Vercel deployment
const BASE_URL = 'https://foundly-olive.vercel.app';

async function testVercelAPI() {
  console.log('🧪 Testing Vercel API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Generate unique email
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    // Test registration
    console.log('\n2️⃣ Testing user registration...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test User',
      email: testEmail,
      password: testPassword
    });
    console.log('✅ Registration successful:', registerResponse.data.message);

    // Test login with the same credentials
    console.log('\n3️⃣ Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('✅ Login successful:', loginResponse.data.message);

    const token = loginResponse.data.token;

    // Test organizations endpoint
    console.log('\n4️⃣ Testing organizations endpoint...');
    const orgsResponse = await axios.get(`${BASE_URL}/api/organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Organizations endpoint working:', orgsResponse.data);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    
    if (error.response?.status) {
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testVercelAPI(); 