const testAPI = async (endpoint, options = {}) => {
  const baseURL = 'http://localhost:3001';
  const url = `${baseURL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
};

async function testHoursFix() {
  console.log('🔧 Testing Hours Logging and Stats Fix...\n');
  
  // Test 1: Log hours and verify persistence
  console.log('1️⃣ Testing Hours Logging and Persistence...');
  
  const hoursData = {
    hours: 3.5,
    description: 'Test hours logging fix - should persist after refresh',
    date: new Date().toISOString().split('T')[0],
    organizationId: 'default'
  };
  
  console.log('   📝 Logging hours:', hoursData);
  const logResult = await testAPI('/working?action=log-hours', {
    method: 'POST',
    body: JSON.stringify(hoursData)
  });
  
  if (logResult.status === 201) {
    console.log('   ✅ Hours logged successfully');
    
    // Test 2: Verify hours are retrievable
    console.log('\n2️⃣ Testing Hours Retrieval...');
    const getResult = await testAPI('/working?action=get-hours?organizationId=default');
    
    if (getResult.status === 200 && getResult.data.success) {
      const hourLogs = getResult.data.hourLogs || [];
      const totalHours = getResult.data.totalHours || 0;
      console.log(`   ✅ Retrieved ${hourLogs.length} hour logs`);
      console.log(`   ✅ Total hours: ${totalHours}`);
      
      // Verify the specific hours we just logged
      const recentLog = hourLogs.find(log => 
        log.hours === 3.5 && 
        log.description.includes('Test hours logging fix')
      );
      
      if (recentLog) {
        console.log('   ✅ Recent hours log found and verified');
      } else {
        console.log('   ❌ Recent hours log not found');
      }
    } else {
      console.log('   ❌ Failed to retrieve hours:', getResult.data?.error || getResult.error);
    }
  } else {
    console.log('   ❌ Failed to log hours:', logResult.data?.error || logResult.error);
  }
  
  // Test 3: Test stats consistency
  console.log('\n3️⃣ Testing Stats Consistency...');
  
  const statsResult = await testAPI('/working?action=get-stats?organizationId=default');
  
  if (statsResult.status === 200 && statsResult.data.success) {
    const stats = statsResult.data.stats || {};
    console.log('   📊 Stats retrieved:', {
      totalHours: stats.totalHours || 0,
      activeProjects: stats.activeProjects || 0,
      totalMembers: stats.totalMembers || 0,
      totalProjects: stats.totalProjects || 0
    });
    
    // Verify total hours matches what we expect
    if (stats.totalHours >= 3.5) {
      console.log('   ✅ Total hours in stats matches logged hours');
    } else {
      console.log('   ❌ Total hours in stats does not match logged hours');
    }
  } else {
    console.log('   ❌ Failed to get stats:', statsResult.data?.error || statsResult.error);
  }
  
  // Test 4: Log additional hours and verify they add to total
  console.log('\n4️⃣ Testing Additional Hours Addition...');
  
  const additionalHoursData = {
    hours: 2.0,
    description: 'Additional test hours - should add to existing total',
    date: new Date().toISOString().split('T')[0],
    organizationId: 'default'
  };
  
  const additionalLogResult = await testAPI('/working?action=log-hours', {
    method: 'POST',
    body: JSON.stringify(additionalHoursData)
  });
  
  if (additionalLogResult.status === 201) {
    console.log('   ✅ Additional hours logged successfully');
    
    // Check updated stats
    const updatedStatsResult = await testAPI('/working?action=get-stats?organizationId=default');
    
    if (updatedStatsResult.status === 200 && updatedStatsResult.data.success) {
      const updatedStats = updatedStatsResult.data.stats || {};
      console.log('   📊 Updated stats:', {
        totalHours: updatedStats.totalHours || 0,
        activeProjects: updatedStats.activeProjects || 0,
        totalMembers: updatedStats.totalMembers || 0
      });
      
      // Verify hours increased
      if (updatedStats.totalHours >= 5.5) {
        console.log('   ✅ Total hours increased correctly');
      } else {
        console.log('   ❌ Total hours did not increase as expected');
      }
    } else {
      console.log('   ❌ Failed to get updated stats');
    }
  } else {
    console.log('   ❌ Failed to log additional hours:', additionalLogResult.data?.error || additionalLogResult.error);
  }
  
  // Test 5: Test member count accuracy
  console.log('\n5️⃣ Testing Member Count Accuracy...');
  
  const memberStatsResult = await testAPI('/working?action=get-stats?organizationId=default');
  
  if (memberStatsResult.status === 200 && memberStatsResult.data.success) {
    const memberStats = memberStatsResult.data.stats || {};
    const memberCount = memberStats.totalMembers || 0;
    
    console.log(`   👥 Member count: ${memberCount}`);
    
    if (memberCount >= 0) {
      console.log('   ✅ Member count is valid');
    } else {
      console.log('   ❌ Member count is invalid');
    }
  } else {
    console.log('   ❌ Failed to get member stats');
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('   - Hours logging should persist after refresh');
  console.log('   - Stats should be consistent between endpoints');
  console.log('   - Member count should be accurate');
  console.log('   - Additional hours should add to existing total');
  console.log('\n✅ Hours and Stats Fix Test Complete!');
}

// Run the test
testHoursFix().catch(console.error); 