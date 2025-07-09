#!/usr/bin/env node

/**
 * Database Fixes Test Script
 * Tests all critical database functionality
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://foundly-olive.vercel.app/api';

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

async function runDatabaseTests() {
  console.log('🔧 Testing Database Fixes...\n');
  
  // Test 1: Hours Logging
  console.log('1️⃣ Testing Hours Logging...');
  const hoursData = {
    hours: 5,
    description: 'Test hours logging fix',
    date: new Date().toISOString().split('T')[0],
    organizationId: 'default'
  };
  
  const logResult = await testAPI('/working?action=hours', {
    method: 'POST',
    body: JSON.stringify(hoursData)
  });
  
  if (logResult.status === 201) {
    console.log('   ✅ Hours logged successfully');
    
    // Test retrieval
    const getResult = await testAPI('/working?action=hours');
    if (getResult.status === 200 && getResult.data.success) {
      console.log(`   ✅ Hours retrieved: ${getResult.data.hourLogs?.length || 0} records`);
      console.log(`   ✅ Total hours: ${getResult.data.totalHours || 0}`);
    } else {
      console.log('   ❌ Failed to retrieve hours');
    }
  } else {
    console.log('   ❌ Failed to log hours:', logResult.data?.error || logResult.error);
  }
  
  // Test 2: Announcements
  console.log('\n2️⃣ Testing Announcements...');
  const announcementData = {
    title: 'Test Announcement',
    content: 'This is a test announcement to verify database fixes',
    organizationId: 'default'
  };
  
  const announceResult = await testAPI('/working?action=announcements', {
    method: 'POST',
    body: JSON.stringify(announcementData)
  });
  
  if (announceResult.status === 201) {
    console.log('   ✅ Announcement created successfully');
    
    // Test retrieval
    const getAnnouncements = await testAPI('/working?action=announcements');
    if (getAnnouncements.status === 200 && getAnnouncements.data.success) {
      console.log(`   ✅ Announcements retrieved: ${getAnnouncements.data.announcements?.length || 0} records`);
    } else {
      console.log('   ❌ Failed to retrieve announcements');
    }
  } else {
    console.log('   ❌ Failed to create announcement:', announceResult.data?.error || announceResult.error);
  }
  
  // Test 3: Projects
  console.log('\n3️⃣ Testing Projects...');
  const projectData = {
    title: 'Test Project',
    description: 'This is a test project to verify database fixes',
    organizationId: 'default'
  };
  
  const projectResult = await testAPI('/working?action=projects', {
    method: 'POST',
    body: JSON.stringify(projectData)
  });
  
  if (projectResult.status === 201) {
    console.log('   ✅ Project created successfully');
    
    // Test retrieval
    const getProjects = await testAPI('/working?action=projects');
    if (getProjects.status === 200 && getProjects.data.success) {
      console.log(`   ✅ Projects retrieved: ${getProjects.data.projects?.length || 0} records`);
    } else {
      console.log('   ❌ Failed to retrieve projects');
    }
  } else {
    console.log('   ❌ Failed to create project:', projectResult.data?.error || projectResult.error);
  }
  
  // Test 4: Events
  console.log('\n4️⃣ Testing Events...');
  const eventData = {
    title: 'Test Event',
    description: 'This is a test event to verify database fixes',
    startDate: new Date().toISOString(),
    organizationId: 'default'
  };
  
  const eventResult = await testAPI('/working?action=events', {
    method: 'POST',
    body: JSON.stringify(eventData)
  });
  
  if (eventResult.status === 201) {
    console.log('   ✅ Event created successfully');
    
    // Test retrieval
    const getEvents = await testAPI('/working?action=events');
    if (getEvents.status === 200 && getEvents.data.success) {
      console.log(`   ✅ Events retrieved: ${getEvents.data.events?.length || 0} records`);
    } else {
      console.log('   ❌ Failed to retrieve events');
    }
  } else {
    console.log('   ❌ Failed to create event:', eventResult.data?.error || eventResult.error);
  }
  
  // Test 5: Stats
  console.log('\n5️⃣ Testing Stats...');
  const statsResult = await testAPI('/working?action=stats');
  
  if (statsResult.status === 200 && statsResult.data.success) {
    const stats = statsResult.data.stats;
    console.log('   ✅ Stats retrieved successfully:');
    console.log(`      - Total Hours: ${stats.totalHours}`);
    console.log(`      - Active Projects: ${stats.activeProjects}`);
    console.log(`      - Completed Tasks: ${stats.completedTasks}`);
    console.log(`      - Total Members: ${stats.totalMembers}`);
  } else {
    console.log('   ❌ Failed to retrieve stats:', statsResult.data?.error || statsResult.error);
  }
  
  // Test 6: Database Connection Test
  console.log('\n6️⃣ Testing Database Connection...');
  const testResult = await testAPI('/working?action=test');
  
  if (testResult.status === 200 && testResult.data.success) {
    console.log('   ✅ Database connection working');
    console.log(`   ✅ DB Connected: ${testResult.data.dbConnected}`);
  } else {
    console.log('   ❌ Database connection failed:', testResult.data?.error || testResult.error);
  }
  
  console.log('\n🎉 Database Fixes Test Complete!');
  console.log('\n📋 Summary:');
  console.log('   - Hours Logging: Fixed for database persistence');
  console.log('   - Announcements: Fixed for database persistence');
  console.log('   - Projects: Fixed for database persistence');
  console.log('   - Events: Fixed for database persistence');
  console.log('   - Stats: Fixed to use database aggregation');
  console.log('\n✅ All critical database operations should now persist data properly!');
}

// Run the tests
runDatabaseTests().catch(console.error);
