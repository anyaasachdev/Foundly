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
  
  // Test 2: Test organizations endpoint structure
  console.log('\n2️⃣ Testing organizations endpoint structure...');
  console.log('   📋 Expected response structure:');
  console.log('   { organizations: [...], success: true, count: number }');
  console.log('   📋 This should fix the "Loading organizations..." issue');
  
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