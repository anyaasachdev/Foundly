// EMERGENCY FIX FOR ORGANIZATION PERSISTENCE
// This code should be added to the login process to force organization detection

// 1. Enhanced login service to FORCE organization data retrieval
async function emergencyLoginFix(email, password) {
  try {
    console.log('🚨 EMERGENCY LOGIN FIX: Starting for', email);
    
    // Step 1: Normal login
    const loginResponse = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(loginData.error || 'Login failed');
    }
    
    console.log('✅ Login successful, checking organizations...');
    console.log('📊 Organizations in login response:', loginData.user?.organizations?.length || 0);
    
    // Step 2: FORCE organization retrieval if not in login response
    let userOrganizations = loginData.user?.organizations || [];
    
    if (userOrganizations.length === 0) {
      console.log('🔄 No orgs in login response, forcing API call...');
      
      try {
        const orgResponse = await fetch('/api/auth?action=get-orgs', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          userOrganizations = orgData.organizations || [];
          console.log('📡 Retrieved from API:', userOrganizations.length, 'organizations');
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
      }
    }
    
    // Step 3: FORCE organization from localStorage if API fails
    if (userOrganizations.length === 0) {
      console.log('🔄 Checking localStorage for emergency org data...');
      
      const storedOrgData = localStorage.getItem('userOrganizationData');
      const currentOrgId = localStorage.getItem('currentOrganization');
      
      if (storedOrgData) {
        try {
          const orgPref = JSON.parse(storedOrgData);
          if (orgPref.userEmail === email && orgPref.organizationId) {
            console.log('🛡️ EMERGENCY: Using stored organization preference');
            
            // Create a mock organization object to prevent re-signup
            userOrganizations = [{
              role: orgPref.role || 'member',
              organizationId: orgPref.organizationId,
              organization: {
                _id: orgPref.organizationId,
                name: orgPref.organizationName || 'Your Organization',
                description: 'Recovered from stored preferences'
              }
            }];
            
            // Ensure currentOrganization is set
            localStorage.setItem('currentOrganization', orgPref.organizationId);
          }
        } catch (e) {
          console.error('Error parsing stored org data:', e);
        }
      }
    }
    
    // Step 4: Update user data with organizations
    const enhancedUser = {
      ...loginData.user,
      organizations: userOrganizations
    };
    
    // Step 5: Store complete user data
    localStorage.setItem('user', JSON.stringify(enhancedUser));
    localStorage.setItem('authToken', loginData.token);
    if (loginData.refreshToken) {
      localStorage.setItem('refreshToken', loginData.refreshToken);
    }
    
    // Step 6: Set current organization if user has orgs
    if (userOrganizations.length > 0) {
      const currentOrgId = localStorage.getItem('currentOrganization');
      if (!currentOrgId) {
        const firstOrg = userOrganizations[0];
        const orgId = firstOrg.organization?._id || firstOrg.organizationId;
        localStorage.setItem('currentOrganization', orgId);
        console.log('🎯 Set current organization:', orgId);
      }
      
      // Store user organization preference for future
      const firstOrg = userOrganizations[0];
      localStorage.setItem('userOrganizationData', JSON.stringify({
        userEmail: email,
        organizationId: firstOrg.organization?._id || firstOrg.organizationId,
        organizationName: firstOrg.organization?.name || 'Your Organization',
        role: firstOrg.role || 'member',
        setAt: new Date().toISOString(),
        source: 'emergency_fix'
      }));
    }
    
    console.log('🎉 EMERGENCY FIX COMPLETE:');
    console.log('   User organizations:', userOrganizations.length);
    console.log('   Current org set:', !!localStorage.getItem('currentOrganization'));
    console.log('   Should skip org setup:', userOrganizations.length > 0);
    
    return {
      success: true,
      user: enhancedUser,
      organizationsFound: userOrganizations.length,
      shouldSkipOrgSetup: userOrganizations.length > 0
    };
    
  } catch (error) {
    console.error('🚨 EMERGENCY FIX FAILED:', error);
    throw error;
  }
}

// 2. Emergency organization check that NEVER allows org setup for existing users
function emergencyOrganizationCheck(userData) {
  console.log('🛡️ EMERGENCY ORG CHECK for:', userData.email);
  
  // Check 1: User organizations
  if (userData.organizations && userData.organizations.length > 0) {
    console.log('✅ PASS: User has organizations in data');
    return { shouldSkipOrgSetup: true, reason: 'User has organizations' };
  }
  
  // Check 2: Current organization ID
  const currentOrgId = localStorage.getItem('currentOrganization');
  if (currentOrgId) {
    console.log('✅ PASS: Current organization ID exists');
    return { shouldSkipOrgSetup: true, reason: 'Current org ID exists' };
  }
  
  // Check 3: User organization preference
  const userOrgData = localStorage.getItem('userOrganizationData');
  if (userOrgData) {
    try {
      const orgPref = JSON.parse(userOrgData);
      if (orgPref.userEmail === userData.email && orgPref.organizationId) {
        console.log('✅ PASS: User organization preference exists');
        
        // Restore organization data
        localStorage.setItem('currentOrganization', orgPref.organizationId);
        
        return { shouldSkipOrgSetup: true, reason: 'User org preference exists' };
      }
    } catch (e) {
      console.error('Error checking org preference:', e);
    }
  }
  
  // Check 4: This is likely a returning user - be defensive
  const hasAuthData = localStorage.getItem('authToken') && localStorage.getItem('user');
  if (hasAuthData) {
    console.log('⚠️ DEFENSIVE: User has auth data, likely returning user');
    
    // Set a placeholder to prevent org setup
    localStorage.setItem('userOrganizationData', JSON.stringify({
      userEmail: userData.email,
      organizationId: 'placeholder-org',
      organizationName: 'Recovering Organization...',
      role: 'member',
      setAt: new Date().toISOString(),
      source: 'defensive_check'
    }));
    
    return { shouldSkipOrgSetup: true, reason: 'Defensive check - returning user' };
  }
  
  console.log('❌ FAIL: All checks failed, allowing org setup');
  return { shouldSkipOrgSetup: false, reason: 'New user' };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { emergencyLoginFix, emergencyOrganizationCheck };
}

console.log('🚨 EMERGENCY FIX LOADED');
console.log('Use: emergencyLoginFix(email, password)');
console.log('Use: emergencyOrganizationCheck(userData)');
