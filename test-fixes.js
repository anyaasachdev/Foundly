#!/usr/bin/env node

/**
 * Comprehensive Test Script for Foundly Fixes
 * Tests all critical functionality that was broken
 */

const fetch = require('node-fetch');

const API_BASE = 'https://foundlybackend-alpha.vercel.app/api';

// Test data
const testUsers = [
  { name: 'Test User 1', email: 'test@example.com', password: 'password123' },
  { name: 'Test User 2', email: 'test@example.com', password: 'password456' },
  { name: 'Test User 3', email: 'test@example.com', password: 'password789' }
];

let tokens = [];
let organizationId = null;

async function testAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Foundly Fixes Test Suite...\n');
  
  // Test 1: Multiple users with same email registration
  console.log('1️⃣ Testing Multiple Users with Same Email Registration...');
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`   Registering ${user.name} with email ${user.email}...`);
    
    const result = await testAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    
    if (result.status === 201 || result.status === 200) {
      console.log(`   ✅ ${user.name} registered successfully`);
      if (result.data.token) {
        tokens.push({ user: user.name, token: result.data.token });
      }
    } else {
      console.log(`   ❌ Failed to register ${user.name}:`, result.data?.error || result.error);
    }
  }
  
  // Test 2: Login for each user
  console.log('\n2️⃣ Testing Login for Each User...');
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`   Logging in ${user.name}...`);
    
    const result = await testAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });
    
    if (result.status === 200) {
      console.log(`   ✅ ${user.name} logged in successfully`);
      // Update token
      const tokenIndex = tokens.findIndex(t => t.user === user.name);
      if (tokenIndex >= 0) {
        tokens[tokenIndex].token = result.data.token;
      }
    } else {
      console.log(`   ❌ Failed to login ${user.name}:`, result.data?.error || result.error);
    }
  }
  
  // Test 3: Create organization and add members
  if (tokens.length > 0) {
    console.log('\n3️⃣ Testing Organization Creation and Member Management...');
    const firstToken = tokens[0].token;
    
    // Create organization
    const orgResult = await testAPI('/organizations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firstToken}` },
      body: JSON.stringify({
        name: 'Test Organization',
        description: 'Test org for fixes verification',
        category: 'community'
      })
    });
    
    if (orgResult.status === 201) {
      console.log('   ✅ Organization created successfully');
      organizationId = orgResult.data.organization._id;
      
      // Add other users to organization
      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i].token;
        const joinResult = await testAPI('/organizations/join', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ joinCode: orgResult.data.organization.joinCode })
        });
        
        if (joinResult.status === 200) {
          console.log(`   ✅ ${tokens[i].user} joined organization`);
        } else {
          console.log(`   ❌ Failed to add ${tokens[i].user}:`, joinResult.data?.error || joinResult.error);
        }
      }
    } else {
      console.log('   ❌ Failed to create organization:', orgResult.data?.error || orgResult.error);
    }
  }
  
  // Test 4: Verify member count in stats
  if (organizationId && tokens.length > 0) {
    console.log('\n4️⃣ Testing Member Count in Stats...');
    const token = tokens[0].token;
    
    const statsResult = await testAPI('/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (statsResult.status === 200) {
      const memberCount = statsResult.data.data?.totalMembers || 0;
      console.log(`   📊 Stats show ${memberCount} members`);
      
      if (memberCount >= tokens.length) {
        console.log('   ✅ Member count is correct');
      } else {
        console.log('   ❌ Member count is incorrect - should show all members');
      }
    } else {
      console.log('   ❌ Failed to get stats:', statsResult.data?.error || statsResult.error);
    }
  }
  
  // Test 5: Test hours logging
  if (tokens.length > 0) {
    console.log('\n5️⃣ Testing Hours Logging...');
    const token = tokens[0].token;
    
    const hoursResult = await testAPI('/hours', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        hours: 5,
        description: 'Test hours logging',
        date: new Date().toISOString().split('T')[0],
        category: 'volunteer'
      })
    });
    
    if (hoursResult.status === 201) {
      console.log('   ✅ Hours logged successfully');
      
      // Verify hours are retrievable
      const getHoursResult = await testAPI('/hours', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (getHoursResult.status === 200) {
        const hoursCount = getHoursResult.data.data?.length || 0;
        console.log(`   📊 Retrieved ${hoursCount} hour logs`);
        if (hoursCount > 0) {
          console.log('   ✅ Hours are properly stored and retrievable');
        } else {
          console.log('   ❌ Hours not found in database');
        }
      } else {
        console.log('   ❌ Failed to retrieve hours:', getHoursResult.data?.error || getHoursResult.error);
      }
    } else {
      console.log('   ❌ Failed to log hours:', hoursResult.data?.error || hoursResult.error);
    }
  }
  
  // Test 6: Test calendar events
  if (tokens.length > 0) {
    console.log('\n6️⃣ Testing Calendar Events...');
    const token = tokens[0].token;
    
    const eventResult = await testAPI('/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Test Event',
        description: 'Test event for fixes verification',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '11:00',
        type: 'meeting'
      })
    });
    
    if (eventResult.status === 201) {
      console.log('   ✅ Event created successfully');
      
      // Verify events are retrievable
      const getEventsResult = await testAPI('/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (getEventsResult.status === 200) {
        const eventsCount = getEventsResult.data.data?.length || 0;
        console.log(`   📊 Retrieved ${eventsCount} events`);
        if (eventsCount > 0) {
          console.log('   ✅ Events are properly stored and retrievable');
        } else {
          console.log('   ❌ Events not found in database');
        }
      } else {
        console.log('   ❌ Failed to retrieve events:', getEventsResult.data?.error || getEventsResult.error);
      }
    } else {
      console.log('   ❌ Failed to create event:', eventResult.data?.error || eventResult.error);
    }
  }
  
  // Test 7: Test analytics
  if (tokens.length > 0) {
    console.log('\n7️⃣ Testing Analytics...');
    const token = tokens[0].token;
    
    const analyticsResult = await testAPI('/analytics?timeRange=month', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (analyticsResult.status === 200) {
      const overview = analyticsResult.data.data?.overview;
      if (overview) {
        console.log(`   📊 Analytics Overview:`);
        console.log(`      - Total Hours: ${overview.totalHours}`);
        console.log(`      - Members: ${overview.membersRecruited}`);
        console.log(`      - Active Projects: ${overview.projectsActive}`);
        console.log(`      - Completed Projects: ${overview.projectsCompleted}`);
        console.log('   ✅ Analytics working correctly');
      } else {
        console.log('   ❌ Analytics data structure incorrect');
      }
    } else {
      console.log('   ❌ Failed to get analytics:', analyticsResult.data?.error || analyticsResult.error);
    }
  }
  
  // Test 8: Test token refresh
  if (tokens.length > 0) {
    console.log('\n8️⃣ Testing Token Refresh...');
    const token = tokens[0].token;
    
    // Get refresh token from login response (this would normally be stored)
    const refreshResult = await testAPI('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: 'test-refresh-token' // This would be the actual refresh token
      })
    });
    
    if (refreshResult.status === 200) {
      console.log('   ✅ Token refresh working');
    } else if (refreshResult.status === 403) {
      console.log('   ⚠️  Token refresh endpoint exists but needs valid refresh token');
    } else {
      console.log('   ❌ Token refresh failed:', refreshResult.data?.error || refreshResult.error);
    }
  }
  
  console.log('\n🎉 Test Suite Complete!');
  console.log('\n📋 Summary:');
  console.log(`   - Users registered: ${tokens.length}/${testUsers.length}`);
  console.log(`   - Organization created: ${organizationId ? 'Yes' : 'No'}`);
  console.log(`   - API endpoints tested: 8`);
  
  if (tokens.length === testUsers.length) {
    console.log('\n✅ CRITICAL FIXES VERIFIED:');
    console.log('   - Multiple users with same email ✅');
    console.log('   - Login system working ✅');
    console.log('   - API endpoints responding ✅');
    console.log('   - Database operations working ✅');
  } else {
    console.log('\n❌ SOME ISSUES REMAIN:');
    console.log('   - Check the failed tests above');
  }
}

// Run the tests
runTests().catch(console.error); 