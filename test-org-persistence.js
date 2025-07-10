#!/usr/bin/env node

// Test script to verify the complete organization persistence flow
const fetch = require('node-fetch');

const API_BASE = process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api';
console.log('🧪 Testing Organization Persistence End-to-End\n');

async function testOrganizationPersistence() {
  try {
    console.log('1. Testing login with organization data inclusion...\n');
    
    // Test login response (using a hypothetical test account)
    const loginResponse = await fetch(`${API_BASE}/auth?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com', // Replace with actual test email
        password: 'password123'    // Replace with actual test password
      }),
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      
      console.log('✅ Login successful');
      console.log('📋 Login Response Structure:');
      console.log({
        success: loginData.success,
        hasUser: !!loginData.user,
        userEmail: loginData.user?.email,
        userOrganizations: loginData.user?.organizations?.length || 0,
        hasToken: !!loginData.token,
        hasRefreshToken: !!loginData.refreshToken
      });
      
      if (loginData.user?.organizations && loginData.user.organizations.length > 0) {
        console.log('\n✅ Organizations included in login response:');
        loginData.user.organizations.forEach((org, index) => {
          console.log(`   ${index + 1}. ${org.organization?.name || 'Unknown'} (${org.role})`);
          console.log(`      ID: ${org.organization?._id || org.organizationId}`);
        });
        
        // Test getMyOrganizations with the token
        console.log('\n2. Testing getMyOrganizations API...');
        
        const orgResponse = await fetch(`${API_BASE}/auth?action=get-orgs`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          console.log('✅ getMyOrganizations API successful');
          console.log('📋 API Organizations:', orgData.organizations?.length || 0);
          
          // Compare login vs API data
          const loginOrgCount = loginData.user.organizations.length;
          const apiOrgCount = orgData.organizations?.length || 0;
          
          if (loginOrgCount === apiOrgCount && loginOrgCount > 0) {
            console.log('✅ Data consistency: Login and API return same org count');
          } else {
            console.log('❌ Data inconsistency:');
            console.log(`   Login organizations: ${loginOrgCount}`);
            console.log(`   API organizations: ${apiOrgCount}`);
          }
        } else {
          console.log('❌ getMyOrganizations API failed:', orgResponse.status);
        }
        
        // Simulate the checkOrganizationStatus logic
        console.log('\n3. Simulating App.jsx organization check...');
        const userData = loginData.user;
        
        let shouldShowOrgSetup = false;
        let reason = '';
        
        if (userData.organizations && userData.organizations.length > 0) {
          console.log('✅ User has organizations in data - should skip org setup');
          shouldShowOrgSetup = false;
          reason = 'User has organization data';
        } else {
          console.log('❌ User has no organizations in data - would show org setup');
          shouldShowOrgSetup = true;
          reason = 'No organization data found';
        }
        
        console.log('\n📊 Final Result:');
        console.log(`   Show org setup: ${shouldShowOrgSetup}`);
        console.log(`   Reason: ${reason}`);
        
        if (shouldShowOrgSetup && loginOrgCount > 0) {
          console.log('🚨 CRITICAL ISSUE: User has orgs but would still see setup screen!');
        } else if (!shouldShowOrgSetup && loginOrgCount > 0) {
          console.log('✅ CORRECT: User with orgs would skip setup screen');
        }
        
      } else {
        console.log('\n❌ No organizations found in login response');
        console.log('🔧 This means the backend fix is not working correctly');
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData.error);
      console.log('ℹ️  This might be expected if no test user exists');
      
      // Test with a simple auth check
      console.log('\n2. Testing auth endpoint availability...');
      const testResponse = await fetch(`${API_BASE}/auth?action=test`);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Auth endpoint is responding:', testData.message);
      } else {
        console.log('❌ Auth endpoint test failed:', testResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

console.log('🎯 This test checks:');
console.log('1. Does login response include organization data?');
console.log('2. Is getMyOrganizations API working?');
console.log('3. Would the user see org setup screen?');
console.log('4. Are there any data inconsistencies?\n');

testOrganizationPersistence();
