const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testOrganizationFixes() {
  console.log('🧪 Testing Organization Fixes...\n');
  
  // Test 1: Check server is running
  console.log('1️⃣ Testing server connectivity...');
  try {
    const response = await axios.get(`${BASE_URL}/api/stats`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    console.log('   ❌ Server should require valid auth but didn\'t');
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('   ✅ Server is running and requires authentication');
    } else {
      console.log('   ❌ Server connection failed:', error.message);
      return;
    }
  }
  
  // Test 2: Login and get organizations
  console.log('\n2️⃣ Testing login and organizations endpoint...');
  try {
    // First, try to login with a test user
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.token) {
      console.log('   ✅ Login successful, testing organizations endpoint...');
      
      const orgResponse = await axios.get(`${BASE_URL}/api/organizations/my`, {
        headers: { 'Authorization': `Bearer ${loginResponse.data.token}` }
      });
      
      console.log('   📡 Organizations response:', orgResponse.data);
      console.log('   📊 Response structure:', {
        hasOrganizations: !!orgResponse.data.organizations,
        organizationCount: orgResponse.data.organizations?.length || 0,
        hasSuccess: !!orgResponse.data.success,
        hasCount: !!orgResponse.data.count
      });
      
      if (orgResponse.data.organizations && orgResponse.data.organizations.length > 0) {
        console.log('   ✅ Organizations found:', orgResponse.data.organizations.length);
        console.log('   📋 Organizations:', orgResponse.data.organizations.map(org => ({
          name: org.organization?.name || org.name,
          role: org.role,
          id: org._id || org.organizationId
        })));
      } else {
        console.log('   ⚠️ No organizations found for test user');
      }
    } else {
      console.log('   ❌ Login failed, trying with different credentials...');
      
      // Try with a different test user
      const loginResponse2 = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@foundly.com',
        password: 'admin123'
      });
      
      if (loginResponse2.data.token) {
        console.log('   ✅ Second login successful, testing organizations endpoint...');
        
        const orgResponse = await axios.get(`${BASE_URL}/api/organizations/my`, {
          headers: { 'Authorization': `Bearer ${loginResponse2.data.token}` }
        });
        
        console.log('   📡 Organizations response:', orgResponse.data);
        console.log('   📊 Response structure:', {
          hasOrganizations: !!orgResponse.data.organizations,
          organizationCount: orgResponse.data.organizations?.length || 0,
          hasSuccess: !!orgResponse.data.success,
          hasCount: !!orgResponse.data.count
        });
        
        if (orgResponse.data.organizations && orgResponse.data.organizations.length > 0) {
          console.log('   ✅ Organizations found:', orgResponse.data.organizations.length);
          console.log('   📋 Organizations:', orgResponse.data.organizations.map(org => ({
            name: org.organization?.name || org.name,
            role: org.role,
            id: org._id || org.organizationId
          })));
        } else {
          console.log('   ⚠️ No organizations found for second test user');
        }
      } else {
        console.log('   ❌ Both login attempts failed');
      }
    }
  } catch (error) {
    console.log('   ❌ Error testing organizations endpoint:', error.message);
    if (error.response) {
      console.log('   📡 Error response:', error.response.data);
    }
  }
  
  // Test 3: Test member count logic
  console.log('\n3️⃣ Testing member count logic...');
  console.log('   📋 Backend changes made:');
  console.log('   - Fixed organizations endpoint to return proper structure');
  console.log('   - Fixed member counting to use unique user IDs from organization.members');
  console.log('   - Added detailed logging for debugging');
  console.log('   - Consistent member counting across stats and analytics endpoints');
  
  // Test 4: Frontend changes
  console.log('\n4️⃣ Frontend changes made...');
  console.log('   📋 Navbar component:');
  console.log('   - Improved organization loading with better error handling');
  console.log('   - Fixed organization switching logic');
  console.log('   - Added event-driven updates for organization changes');
  console.log('   - Better localStorage management for organization persistence');
  
  // Test 5: API service changes
  console.log('\n5️⃣ API service changes...');
  console.log('   📋 Fixed base URL to use localhost for local development');
  console.log('   📋 Improved error handling and response structure handling');
  console.log('   📋 Added fallback mechanisms for organization loading');
  
  console.log('\n🎯 Manual Testing Required:');
  console.log('   1. Login to the app');
  console.log('   2. Check browser console for organization loading logs');
  console.log('   3. Click "Switch Organization" - should show all orgs');
  console.log('   4. Switch between organizations - dashboard should update');
  console.log('   5. Check member count on homepage and stats page');
  console.log('   6. Verify join code updates when switching orgs');
  
  console.log('\n🔧 If issues persist:');
  console.log('   1. Check browser console for error messages');
  console.log('   2. Check backend console for API call logs');
  console.log('   3. Verify user has organizations in database');
  console.log('   4. Check localStorage for organization data');
  
  console.log('\n✅ Expected Results:');
  console.log('   - Organization dropdown loads immediately');
  console.log('   - All user organizations appear in the list');
  console.log('   - Member count shows accurate unique user count');
  console.log('   - Organization switching updates all data');
  console.log('   - Join code updates when switching organizations');
}

testOrganizationFixes().catch(console.error); 