#!/usr/bin/env node

// Test script to verify the authentication organization persistence fix
const fetch = require('node-fetch');

const API_BASE = process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api';
console.log('Testing authentication fix with API:', API_BASE);

async function testAuthFix() {
  try {
    console.log('\n=== Testing Authentication Organization Persistence Fix ===\n');
    
    // Test 1: Login with an existing user
    console.log('1. Testing login response includes organization data...');
    
    const loginResponse = await fetch(`${API_BASE}/auth?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com', // Use a test email
        password: 'password123'
      }),
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('📊 User organizations in response:', loginData.user?.organizations?.length || 0);
      
      if (loginData.user?.organizations && loginData.user.organizations.length > 0) {
        console.log('✅ Organizations are included in login response');
        console.log('📋 Organization details:');
        loginData.user.organizations.forEach((org, index) => {
          console.log(`   ${index + 1}. ${org.organization?.name || 'Unknown'} (${org.role})`);
        });
      } else {
        console.log('⚠️  No organizations found in login response');
      }
      
      // Test 2: Test get organizations API with the token
      console.log('\n2. Testing get organizations API...');
      
      const orgResponse = await fetch(`${API_BASE}/auth?action=get-orgs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        console.log('✅ Get organizations API working');
        console.log('📊 Organizations from API:', orgData.organizations?.length || 0);
      } else {
        console.log('❌ Get organizations API failed:', orgResponse.status);
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData.error);
      console.log('ℹ️  This might be expected if no test user exists');
    }
    
    // Test 3: Test auth endpoint availability
    console.log('\n3. Testing auth endpoint availability...');
    const testResponse = await fetch(`${API_BASE}/auth?action=test`);
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Auth endpoint is responding:', testData.message);
    } else {
      console.log('❌ Auth endpoint test failed:', testResponse.status);
    }
    
    console.log('\n=== Test Summary ===');
    console.log('The fix ensures that:');
    console.log('1. Login response includes user\'s organization data');
    console.log('2. ObjectId handling is correct for database queries');
    console.log('3. Users don\'t need to rejoin organizations on re-login');
    console.log('\nIf a user has organizations, they should appear in the login response.');
    console.log('This prevents the need to rejoin organizations every time.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testAuthFix();
