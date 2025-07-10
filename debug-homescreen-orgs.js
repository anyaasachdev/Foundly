#!/usr/bin/env node

// Debug script to test organization loading logic in HomeScreen
console.log('🏠 Debug: HomeScreen Organization Loading\n');

// Simulate different user data scenarios
const scenarios = [
  {
    name: 'User with organization data (correct scenario)',
    user: {
      email: 'user@example.com',
      organizations: [
        {
          role: 'admin',
          organizationId: '507f1f77bcf86cd799439011',
          organization: {
            _id: '507f1f77bcf86cd799439011',
            name: 'My Real Organization',
            description: 'A real organization'
          }
        }
      ]
    },
    currentOrgId: '507f1f77bcf86cd799439011',
    apiResponse: { organizations: [] }
  },
  {
    name: 'User without organization data (problem scenario)',
    user: {
      email: 'user@example.com',
      organizations: []
    },
    currentOrgId: null,
    apiResponse: { organizations: [] }
  },
  {
    name: 'User with organizations from API only',
    user: {
      email: 'user@example.com',
      organizations: []
    },
    currentOrgId: null,
    apiResponse: {
      organizations: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'API Organization',
          description: 'From API'
        }
      ]
    }
  }
];

function simulateOrganizationLoading(scenario) {
  console.log(`\n📋 Scenario: ${scenario.name}`);
  console.log('👤 User data:', {
    email: scenario.user.email,
    organizationCount: scenario.user.organizations?.length || 0
  });
  
  // Simulate the HomeScreen logic
  let organizations = [];
  let dataSource = '';
  
  if (scenario.user?.organizations && scenario.user.organizations.length > 0) {
    console.log('✅ Using organizations from user data');
    organizations = scenario.user.organizations;
    dataSource = 'user data';
  } else {
    console.log('🌐 Would fetch from API...');
    organizations = scenario.apiResponse?.organizations || [];
    dataSource = 'API';
  }
  
  console.log('📊 Organizations found:', organizations.length, 'from', dataSource);
  
  if (organizations.length > 0) {
    const currentOrgId = scenario.currentOrgId;
    let currentOrg = null;
    
    // Try to find by currentOrgId first
    if (currentOrgId) {
      currentOrg = organizations.find(org => {
        const orgId = org._id || org.organization?._id || org.organizationId?._id || org.organizationId;
        return orgId === currentOrgId;
      });
    }
    
    // If not found, use the first organization
    if (!currentOrg) {
      const firstOrgData = organizations[0];
      if (firstOrgData.organization) {
        // User data format
        currentOrg = {
          ...firstOrgData.organization,
          role: firstOrgData.role
        };
      } else {
        // Direct organization format
        currentOrg = firstOrgData;
      }
    }
    
    console.log('🎯 Selected organization:', currentOrg.name);
    console.log('🏢 Organization ID:', currentOrg._id);
    console.log('👑 User role:', currentOrg.role || 'member');
    console.log('✅ Result: User goes to REAL organization homepage');
    
    return { success: true, organization: currentOrg };
  } else {
    console.log('❌ No organizations found');
    console.log('⚠️  Result: User sees "Getting Started" temporary org');
    console.log('💡 This means user will see the setup screen instead of their org');
    
    return { success: false, showTempOrg: true };
  }
}

// Test all scenarios
scenarios.forEach(scenario => {
  const result = simulateOrganizationLoading(scenario);
  
  if (!result.success && scenario.name.includes('correct scenario')) {
    console.log('🚨 ERROR: This scenario should work but shows Getting Started!');
  }
});

console.log('\n💡 Key Insights:');
console.log('1. If user.organizations is empty → Shows "Getting Started"');
console.log('2. If API returns empty → Shows "Getting Started"');
console.log('3. Only when user has organization data OR API has data → Shows real org');

console.log('\n🔧 What to check:');
console.log('1. Does login response include organization data?');
console.log('2. Is user data being stored correctly in localStorage?');
console.log('3. Is the organization data being passed to HomeScreen?');
console.log('4. Is the API returning the correct organizations?');

console.log('\n🖥️  Browser debugging:');
console.log('Open browser console and check:');
console.log('- User prop in HomeScreen component');
console.log('- localStorage user data');
console.log('- API response for getMyOrganizations()');
console.log('- Console logs from HomeScreen loadOrganizationData()');
