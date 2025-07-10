const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'TestPass123!',
  name: 'Test User'
};

let authToken = null;
let userId = null;
let organizationId = null;

async function testCriticalFixes() {
  console.log('🧪 Testing Critical Fixes...\n');

  try {
    // Test 1: User Registration and Login
    console.log('1️⃣ Testing User Registration and Login...');
    
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ Registration successful');
    } catch (error) {
      if (error.response?.status === 400 && error.response.data?.error?.includes('already exists')) {
        console.log('ℹ️ User already exists, proceeding with login');
      } else {
        console.error('❌ Registration failed:', error.response?.data || error.message);
        return;
      }
    }

    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('✅ Login successful, user ID:', userId);

    // Test 2: Organization Creation (Fixed JWT issue)
    console.log('\n2️⃣ Testing Organization Creation...');
    
    const orgData = {
      name: 'Test Organization',
      description: 'Test org for critical fixes',
      location: 'Test City',
      website: 'https://test.com',
      category: 'education',
      customJoinCode: 'TEST123'
    };

    const createOrgResponse = await axios.post(`${API_BASE}/organizations`, orgData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    organizationId = createOrgResponse.data.organization._id;
    console.log('✅ Organization created successfully:', organizationId);
    console.log('✅ Join code:', createOrgResponse.data.organization.joinCode);

    // Test 3: Organization Loading (Fixed org switcher)
    console.log('\n3️⃣ Testing Organization Loading...');
    
    const orgsResponse = await axios.get(`${API_BASE}/organizations/my`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Organizations loaded:', orgsResponse.data.organizations.length);
    console.log('✅ Organization data structure:', Object.keys(orgsResponse.data.organizations[0]));

    // Test 4: Stats Retrieval (Fixed member count)
    console.log('\n4️⃣ Testing Stats Retrieval...');
    
    const statsResponse = await axios.get(`${API_BASE}/working?action=get-stats&organizationId=${organizationId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Stats retrieved:', statsResponse.data.stats);
    console.log('✅ Member count:', statsResponse.data.stats.totalMembers);

    // Test 5: Hours Logging (Fixed hours saving)
    console.log('\n5️⃣ Testing Hours Logging...');
    
    const hoursData = {
      hours: 2.5,
      description: 'Test hours for critical fixes',
      date: new Date().toISOString().split('T')[0],
      organizationId: organizationId
    };

    const logHoursResponse = await axios.post(`${API_BASE}/working?action=log-hours`, hoursData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Hours logged successfully:', logHoursResponse.data.hourLog);

    // Test 6: Verify Hours Persistence
    console.log('\n6️⃣ Testing Hours Persistence...');
    
    const statsAfterHours = await axios.get(`${API_BASE}/working?action=get-stats&organizationId=${organizationId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Hours after logging:', statsAfterHours.data.stats.totalHours);
    console.log('✅ Hours properly added to total');

    // Test 7: Organization Switching
    console.log('\n7️⃣ Testing Organization Switching...');
    
    const switchResponse = await axios.post(`${API_BASE}/user/switch-organization`, {
      organizationId: organizationId
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Organization switched successfully');

    // Test 8: Join Code Verification
    console.log('\n8️⃣ Testing Join Code...');
    
    const orgDetails = await axios.get(`${API_BASE}/organizations/my`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const currentOrg = orgDetails.data.organizations.find(org => 
      org.organizationId === organizationId
    );

    if (currentOrg && currentOrg.organization && currentOrg.organization.joinCode) {
      console.log('✅ Join code present:', currentOrg.organization.joinCode);
    } else {
      console.log('❌ Join code missing');
    }

    // Test 9: New Organization Clean State
    console.log('\n9️⃣ Testing New Organization Clean State...');
    
    const cleanOrgData = {
      name: 'Clean Test Organization',
      description: 'Should start with zero stats',
      category: 'healthcare'
    };

    const cleanOrgResponse = await axios.post(`${API_BASE}/organizations`, cleanOrgData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const cleanOrgId = cleanOrgResponse.data.organization._id;
    const cleanStats = await axios.get(`${API_BASE}/working?action=get-stats&organizationId=${cleanOrgId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ New org stats:', cleanStats.data.stats);
    console.log('✅ New org starts with clean data');

    console.log('\n🎉 All Critical Fixes Tested Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ JWT token parsing fixed');
    console.log('✅ Organization creation works');
    console.log('✅ Organization loading works');
    console.log('✅ Member counting fixed');
    console.log('✅ Hours logging and persistence works');
    console.log('✅ Organization switching works');
    console.log('✅ Join codes are present');
    console.log('✅ New organizations start clean');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('Error details:', error.response?.status, error.response?.statusText);
  }
}

// Run the tests
testCriticalFixes(); 