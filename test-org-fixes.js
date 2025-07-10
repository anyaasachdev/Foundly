// Use built-in fetch in Node.js
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testAPI(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Testing: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      data,
      error: null
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function testOrganizationFixes() {
  console.log('🧪 Testing Organization and Stats Fixes\n');
  
  // Test 1: Create organization with clean stats
  console.log('1️⃣ Testing Organization Creation with Clean Stats...');
  
  const createOrgResult = await testAPI('/api/organizations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test-token' },
    body: JSON.stringify({
      name: 'Test Organization Fixes',
      description: 'Testing organization fixes',
      customJoinCode: 'TEST123'
    })
  });
  
  if (createOrgResult.status === 201) {
    console.log('   ✅ Organization created successfully');
    const org = createOrgResult.data.organization;
    console.log('   📊 Organization stats:', org.stats);
    
    // Verify clean stats
    if (org.stats.totalMembers === 1 && org.stats.totalHours === 0) {
      console.log('   ✅ Organization starts with clean stats');
    } else {
      console.log('   ❌ Organization does not start with clean stats');
    }
  } else {
    console.log('   ❌ Failed to create organization:', createOrgResult.data?.error || createOrgResult.error);
  }
  
  // Test 2: Test stats consistency
  console.log('\n2️⃣ Testing Stats Consistency...');
  
  const statsResult = await testAPI('/api/stats', {
    headers: { 'Authorization': 'Bearer test-token' }
  });
  
  if (statsResult.status === 200) {
    console.log('   ✅ Stats endpoint working');
    const stats = statsResult.data.data || statsResult.data.stats || {};
    console.log('   📊 Stats:', {
      totalMembers: stats.totalMembers || 0,
      totalHours: stats.totalHours || 0,
      activeProjects: stats.activeProjects || 0
    });
  } else {
    console.log('   ❌ Stats endpoint failed:', statsResult.data?.error || statsResult.error);
  }
  
  // Test 3: Test working API stats
  console.log('\n3️⃣ Testing Working API Stats...');
  
  const workingStatsResult = await testAPI('/api/working?action=get-stats&organizationId=default', {
    headers: { 'Authorization': 'Bearer test-token' }
  });
  
  if (workingStatsResult.status === 200) {
    console.log('   ✅ Working API stats endpoint working');
    const workingStats = workingStatsResult.data.stats || {};
    console.log('   📊 Working API Stats:', {
      totalMembers: workingStats.totalMembers || 0,
      totalHours: workingStats.totalHours || 0,
      activeProjects: workingStats.activeProjects || 0
    });
  } else {
    console.log('   ❌ Working API stats failed:', workingStatsResult.data?.error || workingStatsResult.error);
  }
  
  // Test 4: Test hours logging
  console.log('\n4️⃣ Testing Hours Logging...');
  
  const logHoursResult = await testAPI('/api/working', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test-token' },
    body: JSON.stringify({
      action: 'log-hours',
      hours: 2.5,
      description: 'Test hours for fixes',
      date: new Date().toISOString().split('T')[0],
      organizationId: 'default'
    })
  });
  
  if (logHoursResult.status === 201) {
    console.log('   ✅ Hours logged successfully');
    
    // Check updated stats
    const updatedStatsResult = await testAPI('/api/working?action=get-stats&organizationId=default', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (updatedStatsResult.status === 200) {
      const updatedStats = updatedStatsResult.data.stats || {};
      console.log('   📊 Updated stats after logging hours:', {
        totalHours: updatedStats.totalHours || 0
      });
      
      if (updatedStats.totalHours >= 2.5) {
        console.log('   ✅ Hours properly added to total');
      } else {
        console.log('   ❌ Hours not properly added to total');
      }
    }
  } else {
    console.log('   ❌ Failed to log hours:', logHoursResult.data?.error || logHoursResult.error);
  }
  
  // Test 5: Test organization switching
  console.log('\n5️⃣ Testing Organization Switching...');
  
  const switchOrgResult = await testAPI('/api/user/switch-organization', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test-token' },
    body: JSON.stringify({
      organizationId: 'test-org-id'
    })
  });
  
  if (switchOrgResult.status === 200) {
    console.log('   ✅ Organization switching working');
  } else {
    console.log('   ❌ Organization switching failed:', switchOrgResult.data?.error || switchOrgResult.error);
  }
  
  // Test 6: Test member count accuracy
  console.log('\n6️⃣ Testing Member Count Accuracy...');
  
  const memberStatsResult = await testAPI('/api/working?action=get-stats&organizationId=default', {
    headers: { 'Authorization': 'Bearer test-token' }
  });
  
  if (memberStatsResult.status === 200) {
    const memberStats = memberStatsResult.data.stats || {};
    const memberCount = memberStats.totalMembers || 0;
    
    console.log(`   👥 Member count: ${memberCount}`);
    
    if (memberCount >= 1) {
      console.log('   ✅ Member count is valid (minimum 1)');
    } else {
      console.log('   ❌ Member count is invalid');
    }
  } else {
    console.log('   ❌ Failed to get member stats');
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('   - Organization creation should work without body stream errors');
  console.log('   - New organizations should start with clean stats');
  console.log('   - Stats should be consistent between endpoints');
  console.log('   - Hours logging should add to total, not overwrite');
  console.log('   - Member count should be accurate and consistent');
  console.log('   - Organization switching should work properly');
  console.log('   - Join codes should be displayed correctly');
}

// Run the tests
testOrganizationFixes().catch(console.error); 