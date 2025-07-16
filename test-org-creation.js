const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testOrganizationEndpoints() {
  console.log('🧪 Testing Organization Endpoints...\n');

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User',
      email: 'test5@example.com',
      password: 'TestPass123!'
    });

    const token = registerResponse.data.token;
    console.log('✅ User registered, token received');

    // Step 2: Create an organization
    console.log('\n2️⃣ Creating organization...');
    const createResponse = await axios.post(`${API_BASE}/organizations`, {
      name: 'Test Organization',
      description: 'Test org for endpoint verification',
      customJoinCode: 'TEST789'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Organization created:', createResponse.data);
    const orgId = createResponse.data.organization._id;
    const joinCode = createResponse.data.organization.joinCode;

    // Step 3: Get user organizations
    console.log('\n3️⃣ Getting user organizations...');
    const orgsResponse = await axios.get(`${API_BASE}/organizations/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ User organizations:', orgsResponse.data);

    // Step 4: Test organization switching
    console.log('\n4️⃣ Testing organization switching...');
    const switchResponse = await axios.post(`${API_BASE}/user/switch-organization`, {
      organizationId: orgId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Organization switch response:', switchResponse.data);

    // Step 5: Register another user to test joining
    console.log('\n5️⃣ Registering second user for join test...');
    const register2Response = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User 2',
      email: 'test6@example.com',
      password: 'TestPass123!'
    });

    const token2 = register2Response.data.token;
    console.log('✅ Second user registered');

    // Step 6: Join organization
    console.log('\n6️⃣ Joining organization...');
    const joinResponse = await axios.post(`${API_BASE}/organizations/join`, {
      joinCode: joinCode
    }, {
      headers: { 'Authorization': `Bearer ${token2}` }
    });

    console.log('✅ Join response:', joinResponse.data);

    console.log('\n🎉 All organization endpoints working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testOrganizationEndpoints(); 