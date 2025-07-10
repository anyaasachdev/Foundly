#!/usr/bin/env node

// Debug script to test organization detection logic
console.log('🔍 Debug: Organization Detection Logic\n');

// Simulate different user scenarios
const scenarios = [
  {
    name: 'User with organizations in data (should skip org setup)',
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
    localStorage: {
      currentOrganization: '507f1f77bcf86cd799439011',
      userOrganizationData: JSON.stringify({
        userEmail: 'user@example.com',
        organizationId: '507f1f77bcf86cd799439011',
        organizationName: 'My Real Organization',
        role: 'admin',
        setAt: new Date().toISOString()
      })
    },
    expectedResult: 'SKIP_ORG_SETUP'
  },
  {
    name: 'User without organizations (should show org setup)',
    user: {
      email: 'newuser@example.com',
      organizations: []
    },
    localStorage: {
      currentOrganization: null,
      userOrganizationData: null
    },
    expectedResult: 'SHOW_ORG_SETUP'
  },
  {
    name: 'User with localStorage org data but no user data (should skip org setup)',
    user: {
      email: 'returning@example.com',
      organizations: []
    },
    localStorage: {
      currentOrganization: '507f1f77bcf86cd799439011',
      userOrganizationData: JSON.stringify({
        userEmail: 'returning@example.com',
        organizationId: '507f1f77bcf86cd799439011',
        organizationName: 'Returning User Org',
        role: 'member',
        setAt: new Date().toISOString()
      })
    },
    expectedResult: 'SKIP_ORG_SETUP'
  }
];

function simulateCheckOrganizationStatus(userData, localStorageData) {
  console.log('🧠 Simulating checkOrganizationStatus logic...\n');
  
  // QUICK CHECK 1: User already has organizations in their data
  if (userData.organizations && userData.organizations.length > 0) {
    console.log('✅ QUICK CHECK 1 PASSED: User has organizations in data');
    console.log('   Setting current org to:', userData.organizations[0].organization?._id || userData.organizations[0].organizationId);
    console.log('   Result: SKIP_ORG_SETUP');
    return { needsOrgSetup: false, reason: 'User has organizations in data' };
  }
  
  // QUICK CHECK 2: Current organization ID exists in localStorage
  if (localStorageData.currentOrganization && 
      localStorageData.currentOrganization !== 'placeholder-org' && 
      localStorageData.currentOrganization !== 'null' && 
      localStorageData.currentOrganization !== 'undefined') {
    console.log('✅ QUICK CHECK 2 PASSED: Current organization ID exists');
    console.log('   Current org ID:', localStorageData.currentOrganization);
    console.log('   Result: SKIP_ORG_SETUP');
    return { needsOrgSetup: false, reason: 'Current organization ID exists' };
  }
  
  // QUICK CHECK 3: User organization preference exists
  if (localStorageData.userOrganizationData) {
    try {
      const orgPref = JSON.parse(localStorageData.userOrganizationData);
      if (orgPref.userEmail === userData.email && orgPref.organizationId) {
        console.log('✅ QUICK CHECK 3 PASSED: User organization preference exists');
        console.log('   Restoring org ID:', orgPref.organizationId);
        console.log('   Result: SKIP_ORG_SETUP');
        return { needsOrgSetup: false, reason: 'User organization preference exists' };
      }
    } catch (e) {
      console.log('❌ QUICK CHECK 3 FAILED: Error parsing org preference');
    }
  }
  
  console.log('❌ All quick checks failed');
  console.log('   Result: SHOW_ORG_SETUP');
  return { needsOrgSetup: true, reason: 'No organization indicators found' };
}

// Test each scenario
scenarios.forEach((scenario, index) => {
  console.log(`\n📋 Scenario ${index + 1}: ${scenario.name}`);
  console.log('=' .repeat(60));
  
  console.log('👤 User data:', {
    email: scenario.user.email,
    organizationCount: scenario.user.organizations?.length || 0,
    organizations: scenario.user.organizations?.map(org => ({
      name: org.organization?.name || 'Unknown',
      id: org.organization?._id || org.organizationId,
      role: org.role
    })) || []
  });
  
  console.log('💾 LocalStorage data:', {
    currentOrg: scenario.localStorage.currentOrganization || 'Not set',
    hasOrgPref: !!scenario.localStorage.userOrganizationData
  });
  
  const result = simulateCheckOrganizationStatus(scenario.user, scenario.localStorage);
  
  console.log('\n📊 Result Analysis:');
  console.log('   Expected:', scenario.expectedResult);
  console.log('   Actual:', result.needsOrgSetup ? 'SHOW_ORG_SETUP' : 'SKIP_ORG_SETUP');
  console.log('   Match:', (result.needsOrgSetup && scenario.expectedResult === 'SHOW_ORG_SETUP') || 
                          (!result.needsOrgSetup && scenario.expectedResult === 'SKIP_ORG_SETUP') ? '✅ YES' : '❌ NO');
  console.log('   Reason:', result.reason);
});

console.log('\n🔧 Debugging Tips:');
console.log('1. Check browser console for organization detection logs');
console.log('2. Visit /debug route to see real-time organization status');
console.log('3. Check localStorage for currentOrganization and userOrganizationData');
console.log('4. Verify login response includes organization data');
console.log('5. Test API endpoint /api/auth?action=get-orgs directly');

console.log('\n🚨 Common Issues:');
console.log('- Login response missing organization data');
console.log('- localStorage not being set properly');
console.log('- API calls failing silently');
console.log('- Organization data structure mismatch'); 