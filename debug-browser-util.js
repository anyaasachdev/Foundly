// Browser Console Debug Utility for Organization Persistence
// Copy and paste this into your browser console to debug organization issues

function debugOrganizationPersistence() {
  console.log('🔍 Organization Persistence Debug Report\n');
  
  // Get all relevant localStorage data
  const user = localStorage.getItem('user');
  const currentOrg = localStorage.getItem('currentOrganization');
  const authToken = localStorage.getItem('authToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userOrgData = localStorage.getItem('userOrganizationData');
  
  console.log('📁 LocalStorage Data:');
  console.log('--------------------');
  
  try {
    const userData = user ? JSON.parse(user) : null;
    console.log('👤 User:', {
      exists: !!userData,
      email: userData?.email,
      organizationsCount: userData?.organizations?.length || 0,
      organizations: userData?.organizations?.map(org => ({
        name: org.organization?.name || 'Unknown',
        id: org.organization?._id || org.organizationId,
        role: org.role
      }))
    });
  } catch (e) {
    console.log('❌ User data parse error:', e.message);
  }
  
  console.log('🏢 Current Organization:', currentOrg || 'Not set');
  console.log('🎫 Auth Token:', authToken ? 'Present' : 'Missing');
  console.log('🔄 Refresh Token:', refreshToken ? 'Present' : 'Missing');
  
  try {
    const orgPref = userOrgData ? JSON.parse(userOrgData) : null;
    console.log('⚙️ Organization Preference:', orgPref ? {
      userEmail: orgPref.userEmail,
      organizationId: orgPref.organizationId,
      organizationName: orgPref.organizationName,
      role: orgPref.role,
      setAt: orgPref.setAt
    } : 'Not set');
  } catch (e) {
    console.log('❌ Organization preference parse error:', e.message);
  }
  
  // Simulate the organization check logic
  console.log('\n🧠 Organization Check Simulation:');
  console.log('----------------------------------');
  
  const userData = user ? JSON.parse(user) : null;
  const hasUserOrganizations = userData?.organizations && userData.organizations.length > 0;
  const hasStoredOrgId = !!currentOrg;
  const hasOrgPreference = !!userOrgData;
  
  console.log('✓ Has user organizations:', hasUserOrganizations);
  console.log('✓ Has stored org ID:', hasStoredOrgId);
  console.log('✓ Has org preference:', hasOrgPreference);
  
  const shouldSkipOrgSetup = hasUserOrganizations || hasStoredOrgId || hasOrgPreference;
  
  console.log('\n📊 Result:');
  console.log('----------');
  console.log('🎭 Should show org setup:', !shouldSkipOrgSetup);
  console.log('🏠 Should go to org homepage:', shouldSkipOrgSetup);
  
  if (!shouldSkipOrgSetup) {
    console.log('\n🚨 PROBLEM DETECTED:');
    console.log('User would see organization setup screen!');
    console.log('\n🔧 Possible Solutions:');
    console.log('1. Check if login response includes organization data');
    console.log('2. Verify backend is returning organizations correctly');
    console.log('3. Check if organization data is being stored properly');
  } else {
    console.log('\n✅ LOOKS GOOD:');
    console.log('User should go directly to their organization!');
  }
  
  // Test API calls
  console.log('\n🌐 Testing API Calls:');
  console.log('---------------------');
  
  if (authToken) {
    // Test getMyOrganizations API
    fetch('/api/auth?action=get-orgs', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('📡 getMyOrganizations API response:', {
        success: data.success,
        organizationsCount: data.organizations?.length || 0,
        organizations: data.organizations?.map(org => ({
          name: org.organization?.name || org.name || 'Unknown',
          id: org._id || org.organizationId
        }))
      });
    })
    .catch(error => {
      console.log('❌ API call failed:', error.message);
    });
  } else {
    console.log('❌ Cannot test API - no auth token');
  }
  
  return {
    userData,
    shouldSkipOrgSetup,
    localStorage: {
      user: !!user,
      currentOrg: !!currentOrg,
      authToken: !!authToken,
      userOrgData: !!userOrgData
    }
  };
}

// Add utility functions
window.debugOrganizationPersistence = debugOrganizationPersistence;

window.clearOrgData = function() {
  console.log('🧹 Clearing organization data...');
  localStorage.removeItem('currentOrganization');
  localStorage.removeItem('userOrganizationData');
  console.log('✅ Organization data cleared');
};

window.setTestOrgData = function() {
  console.log('🧪 Setting test organization data...');
  localStorage.setItem('currentOrganization', 'test-org-id');
  localStorage.setItem('userOrganizationData', JSON.stringify({
    userEmail: 'test@example.com',
    organizationId: 'test-org-id',
    organizationName: 'Test Organization',
    role: 'admin',
    setAt: new Date().toISOString()
  }));
  console.log('✅ Test organization data set');
};

console.log('🔧 Organization Debug Utilities Loaded');
console.log('📖 Available functions:');
console.log('  - debugOrganizationPersistence() - Full debug report');
console.log('  - clearOrgData() - Clear organization data');
console.log('  - setTestOrgData() - Set test organization data');
console.log('\n▶️ Run: debugOrganizationPersistence()');

// Auto-run the debug
debugOrganizationPersistence();
