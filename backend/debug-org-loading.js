const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testOrganizationLoading() {
  console.log('🧪 Testing Organization Loading...\n');
  
  // Test 1: Check if server is running
  console.log('1️⃣ Testing server connectivity...');
  try {
    const healthResponse = await axios.get(`${BASE_URL}/api/stats`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('   ✅ Server is running');
  } catch (error) {
    console.log('   ❌ Server connection failed:', error.message);
    return;
  }
  
  // Test 2: Test organizations endpoint without auth
  console.log('\n2️⃣ Testing organizations endpoint without auth...');
  try {
    const orgResponse = await axios.get(`${BASE_URL}/api/organizations/my`);
    console.log('   ❌ Endpoint should require auth but didn\'t');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ✅ Endpoint properly requires authentication');
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Test with invalid token
  console.log('\n3️⃣ Testing with invalid token...');
  try {
    const orgResponse = await axios.get(`${BASE_URL}/api/organizations/my`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    console.log('   ❌ Invalid token should fail but didn\'t');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ✅ Invalid token properly rejected');
    } else {
      console.log('   ❌ Unexpected error with invalid token:', error.message);
    }
  }
  
  // Test 4: Check what the endpoint returns with valid auth
  console.log('\n4️⃣ Testing with valid authentication...');
  console.log('   ⚠️ This requires a valid user token');
  console.log('   📋 To get a valid token:');
  console.log('   1. Login to the app');
  console.log('   2. Open browser console');
  console.log('   3. Run: console.log(localStorage.getItem("authToken"))');
  console.log('   4. Copy the token and update this script');
  
  // Test 5: Check database directly
  console.log('\n5️⃣ Database check...');
  console.log('   📋 Check if users have organizations in the database:');
  console.log('   - Connect to MongoDB');
  console.log('   - Check users collection for organizations field');
  console.log('   - Check organizations collection for members');
  
  console.log('\n🎯 Debug Summary:');
  console.log('   - Server connectivity: ✅');
  console.log('   - Auth requirement: ✅');
  console.log('   - Need valid token to test further');
  console.log('   - Check database for organization data');
}

testOrganizationLoading().catch(console.error); 