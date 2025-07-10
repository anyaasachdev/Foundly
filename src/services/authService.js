class AuthService {
  // Get the API base URL from environment with fallback
  getApiUrl() {
    const apiUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : 'https://foundly-olive.vercel.app/api');
    return apiUrl;
  }

  // Register a new user
  async register(email, password, name) {
    try {
      const response = await fetch(`${this.getApiUrl()}/auth?action=register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store tokens
        localStorage.setItem('authToken', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  // EMERGENCY LOGIN FIX - Forces organization detection to prevent re-signup
  async login(email, password) {
    try {
      console.log('🚨 EMERGENCY LOGIN FIX: Starting for', email);
      
      // Step 1: Normal login
      const response = await fetch(`${this.getApiUrl()}/auth?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Login failed'
        };
      }
      
      console.log('✅ Login successful, checking organizations...');
      console.log('📊 Organizations in login response:', data.user?.organizations?.length || 0);
      
      // Step 2: FORCE organization retrieval if not in login response
      let userOrganizations = data.user?.organizations || [];
      
      if (userOrganizations.length === 0) {
        console.log('🔄 No orgs in login response, forcing API call...');
        
        try {
          const orgResponse = await fetch(`${this.getApiUrl()}/auth?action=get-orgs`, {
            headers: {
              'Authorization': `Bearer ${data.token}`,
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
            }
          } catch (e) {
            console.error('Error parsing stored org data:', e);
          }
        }
      }
      
      // Step 4: Update user data with organizations
      const enhancedUser = {
        ...data.user,
        organizations: userOrganizations
      };
      
      // Step 5: Store complete user data and tokens
      localStorage.setItem('authToken', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(enhancedUser));
      
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
        user: enhancedUser
      };
      
    } catch (error) {
      console.error('🚨 EMERGENCY LOGIN FIX FAILED:', error);
      return {
        success: false,
        error: 'Network error. Please make sure the backend server is running.'
      };
    }
  }

  // Logout user
  async logout() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${this.getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (user && token) {
      try {
        return JSON.parse(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.logout();
        return null;
      }
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
}

const authService = new AuthService();
export default authService;
