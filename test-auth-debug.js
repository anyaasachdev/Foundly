const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAuthAndOrgCreation() {
  console.log('🧪 Testing Authentication and Organization Creation...\n');

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User',
      email: 'testorg@example.com',
      password: 'TestPass123!'
    });

    const token = registerResponse.data.token;
    console.log('✅ User registered, token received:', token.substring(0, 20) + '...');

    // Step 2: Test authentication with the token
    console.log('\n2️⃣ Testing authentication...');
    try {
      const authTestResponse = await axios.get(`${API_BASE}/organizations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Authentication successful, user has organizations:', authTestResponse.data.organizations?.length || 0);
    } catch (authError) {
      console.log('❌ Authentication failed:', authError.response?.data || authError.message);
    }

    // Step 3: Create an organization
    console.log('\n3️⃣ Creating organization...');
    const createResponse = await axios.post(`${API_BASE}/organizations`, {
      name: 'Test Organization',
      description: 'Test org for debugging',
      customJoinCode: 'TEST123'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Organization created:', createResponse.data);
    const orgId = createResponse.data.organization.id;
    const joinCode = createResponse.data.organization.joinCode;

    // Step 4: Verify organization was created
    console.log('\n4️⃣ Verifying organization creation...');
    const verifyResponse = await axios.get(`${API_BASE}/organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ User organizations after creation:', verifyResponse.data.organizations);

    console.log('\n🎉 All tests passed! Organization creation is working correctly.');

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
testAuthAndOrgCreation(); 