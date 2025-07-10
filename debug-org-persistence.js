#!/usr/bin/env node

// Debug script to check organization persistence after browser refresh
console.log('🔍 Debug: Organization Persistence Check\n');

// Simulate what happens in the browser localStorage
console.log('1. Checking localStorage simulation...');

// Mock localStorage data that should exist after login
const mockUserData = {
  email: 'user@example.com',
  name: 'Test User',
  organizations: [
    {
      role: 'admin',
      organizationId: '507f1f77bcf86cd799439011',
      organization: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Organization',
        description: 'A test organization'
      }
    }
  ]
};

const mockCurrentOrgId = '507f1f77bcf86cd799439011';
const mockAuthToken = 'mock.jwt.token';

console.log('📊 Mock user data:', {
  email: mockUserData.email,
  organizationCount: mockUserData.organizations?.length || 0,
  hasCurrentOrg: !!mockCurrentOrgId,
  hasAuthToken: !!mockAuthToken
});

// Simulate the checkOrganizationStatus logic
function simulateOrganizationCheck(userData, currentOrgId) {
  console.log('\n2. Simulating organization status check...');
  
  console.log('🔍 User organizations in data:', userData.organizations?.length || 0);
  console.log('🏢 Current org in storage:', currentOrgId);
  
  // Check if user has organizations in their stored data
  if (userData.organizations && userData.organizations.length > 0) {
    console.log('✅ Found organizations in user data:', userData.organizations.length);
    
    // Check if current org is set
    if (!currentOrgId) {
      const firstOrg = userData.organizations[0];
      const orgId = firstOrg.organization?._id || firstOrg.organizationId?._id || firstOrg.organizationId;
      console.log('🎯 Would set current organization to:', orgId);
      return { needsOrgSetup: false, action: 'setCurrentOrg', orgId };
    }
    
    console.log('✅ User has organizations, would skip org setup');
    return { needsOrgSetup: false, action: 'skipOrgSetup' };
  }
  
  // Check if there's a currentOrganization set (fallback)
  if (currentOrgId) {
    console.log('✅ Found currentOrganization in storage, would skip org setup');
    return { needsOrgSetup: false, action: 'skipOrgSetupFromCurrentOrg' };
  }
  
  console.log('❌ No organizations found, would need org setup');
  return { needsOrgSetup: true, action: 'showOrgSetup' };
}

const result = simulateOrganizationCheck(mockUserData, mockCurrentOrgId);

console.log('\n3. Organization check result:');
console.log('📝 Action:', result.action);
console.log('🎭 Needs org setup:', result.needsOrgSetup);
console.log('🏢 Org ID to set:', result.orgId || 'none');

console.log('\n4. Expected behavior after browser refresh:');
if (result.needsOrgSetup) {
  console.log('❌ ISSUE: Would show organization setup screen');
  console.log('💡 This means the user would see "Welcome to Foundly!" instead of their org homepage');
} else {
  console.log('✅ CORRECT: Would skip organization setup');
  console.log('🏠 User should go directly to their organization homepage');
}

console.log('\n5. Debugging tips:');
console.log('- Check browser localStorage for "user" key');
console.log('- Check browser localStorage for "currentOrganization" key');
console.log('- Check browser localStorage for "authToken" key');
console.log('- Look at browser console logs during app initialization');
console.log('- Verify that login response includes organization data');

console.log('\n6. Quick browser console test:');
console.log('Run this in your browser console:');
console.log('console.log({');
console.log('  user: JSON.parse(localStorage.getItem("user") || "{}"),');
console.log('  currentOrg: localStorage.getItem("currentOrganization"),');
console.log('  authToken: !!localStorage.getItem("authToken")');
console.log('});');
