// Simple test to verify authentication and organization persistence is working

const API_URL = 'https://foundly-olive.vercel.app/api';

// Test the auth endpoint
async function testAuthPersistence() {
  console.log('🧪 Testing Authentication & Organization Persistence...\n');
  
  try {
    // Step 1: Test auth endpoint is working
    console.log('1. Testing auth endpoint...');
    const authTestResponse = await fetch(`${API_URL}/auth?action=test`);
    const authTestData = await authTestResponse.json();
    
    if (authTestData.success) {
      console.log('✅ Auth endpoint is working');
    } else {
      console.log('❌ Auth endpoint test failed');
      return;
    }
    
    // Step 2: Test that we can make requests to the API
    console.log('\n2. Testing API connectivity...');
    
    // Test a simple request
    const response = await fetch(`${API_URL}/auth?action=get-orgs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    // We expect this to fail with 401 (unauthorized) but not with connection error
    if (response.status === 401) {
      console.log('✅ API is accessible (401 unauthorized as expected)');
    } else if (response.status === 500) {
      console.log('⚠️  API is accessible but may have internal errors');
    } else {
      console.log(`⚠️  API returned unexpected status: ${response.status}`);
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy the backend changes (auth.js with ObjectId fix)');
    console.log('2. Test with real user credentials');
    console.log('3. Check browser console for organization data in login response');
    console.log('4. Verify users with existing organizations skip org setup');
    
    console.log('\n🔍 To test with real user:');
    console.log('1. Open browser developer tools');
    console.log('2. Login with existing user account');
    console.log('3. Look for: "📊 Organizations in login response: X"');
    console.log('4. Should see X > 0 for users with existing organizations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('- API endpoint is down');
    console.log('- Network connectivity issues');
    console.log('- CORS configuration problems');
  }
}

// Run the test
testAuthPersistence();
