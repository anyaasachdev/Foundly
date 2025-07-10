class ApiService {
  constructor() {
    // Use environment variable for API URL with fallback
    this.baseURL = process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api';
    this.refreshPromise = null;
    this.version = Date.now() + Math.random(); // Force cache refresh with random
    console.log('ApiService initialized with baseURL:', this.baseURL);
  }
  
  // Add a getter to always get the current token
  get token() {
    return localStorage.getItem('authToken');
  }
  
  setToken(token) {
    localStorage.setItem('authToken', token);
  }
  
  clearToken() {
    localStorage.removeItem('authToken');
  }

  // Token refresh mechanism
  async refreshToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}/auth?action=refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        this.setToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        resolve(data.accessToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearToken();
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        reject(error);
      } finally {
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  async request(endpoint, options = {}) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseURL}${endpoint}${separator}_v=${this.version}`;
    const token = this.token;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    console.log('Making request to:', url);
    console.log('Request config:', {
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body ? 'Present' : 'Not present'
    });

    try {
      const response = await fetch(url, config);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle token expiration
      if (response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the request with new token
          const newToken = this.token;
          config.headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, config);
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          // Refresh failed, redirect to login
          this.clearToken();
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }
      }
      
      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || errorData.details || 'Unknown error';
          console.error('Server error response:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorDetails = await response.text();
        }
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`);
      }
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      console.error('Request details:', {
        url,
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body
      });
      throw error;
    }
  }
  
  // Authentication
  async login(email, password) {
    const response = await this.request('/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      // Store refresh token if provided
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }
    
    return response;
  }
  
  async register(name, email, password) {
    const response = await this.request('/auth?action=register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      // Store refresh token if provided
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }
    
    return response;
  }
  
  async getCurrentUser() {
    return this.request('/auth/me');
  }
  
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    }
  }
  
  // Organizations
  async createOrganization(organizationData) {
    console.log('🏢 Creating organization:', organizationData);
    return this.request('/auth?action=create-org', {
      method: 'POST',
      body: JSON.stringify(organizationData)
    });
  }
  
  async joinOrganization(joinCode) {
    console.log('🔑 Joining organization with code:', joinCode);
    return this.request('/auth?action=join-org', {
      method: 'POST',
      body: JSON.stringify({ joinCode })
    });
  }
  
  async getMyOrganizations() {
    console.log('📊 Getting user organizations...');
    return this.request('/organizations/my');
  }
  
  async switchOrganization(organizationId) {
    // Make API call to switch organization
    console.log('Switching to organization:', organizationId);
    return this.request('/user/switch-organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId })
    });
  }
  
  async leaveOrganization(organizationId) {
    return this.request(`/organizations/${organizationId}/leave`, {
      method: 'POST'
    });
  }
  
  // Announcements
  async createAnnouncement(announcementData) {
    // Use working endpoint with correct action
    console.log('Calling working endpoint with data:', announcementData);
    return this.request('/working?action=create-announcement', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  }
  
  async getAnnouncements() {
    // Use working endpoint with correct action
    return this.request('/working?action=get-announcements');
  }
  
  async markAnnouncementRead(announcementId) {
    return this.request(`/announcements/${announcementId}/read`, {
      method: 'POST'
    });
  }
  
  // Messages
  async getMessages() {
    // Messages not implemented yet - return empty array
    return { messages: [] };
  }
  
  async sendMessage(recipientId, content) {
    // Messages not implemented yet - return success
    return { success: true, message: 'Message sent (not implemented yet)' };
  }
  
  // Users - use organization members instead
  async getUsers() {
    // Get users from current organization
    const orgResponse = await this.request('/working?action=organizations');
    const organizations = orgResponse?.organizations || [];
    const currentOrg = organizations.find(org => 
      org._id === localStorage.getItem('currentOrganization')
    );
    
    if (currentOrg?.members) {
      return { users: currentOrg.members };
    }
    
    return { users: [] };
  }
  
  async updateUserProfile(profileData) {
    // Profile updates not implemented yet
    return { success: true, message: 'Profile updated (not implemented yet)' };
  }
  
  // Projects
  async getProjects() {
    // Use working endpoint with correct action
    const organizationId = localStorage.getItem('currentOrganization') || 'default';
    return this.request(`/working?action=get-projects&organizationId=${organizationId}`);
  }
  
  async createProject(projectData) {
    // Use working endpoint with correct action
    try {
      const result = await this.request('/working?action=create-project', {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
      return result;
    } catch (error) {
      console.error('createProject error:', error);
      throw error;
    }
  }
  
  async updateProject(projectId, projectData) {
    console.log('updateProject called with:', projectId, projectData);
    try {
      const result = await this.request('/working?action=update-project', {
        method: 'PUT',
        body: JSON.stringify({
          projectId,
          ...projectData
        })
      });
      return result;
    } catch (error) {
      console.error('updateProject error:', error);
      throw error;
    }
  }
  
  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  }
  
  // Events
  async getEvents() {
    // Use working endpoint with correct action
    const organizationId = localStorage.getItem('currentOrganization') || 'default';
    return this.request(`/working?action=get-events&organizationId=${organizationId}`);
  }
  
  async createEvent(eventData) {
    // Use working endpoint with correct action
    try {
      const result = await this.request('/working?action=create-event', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      return result;
    } catch (error) {
      console.error('createEvent error:', error);
      throw error;
    }
  }
  
  async updateEvent(eventId, eventData) {
    return this.request(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  }
  
  async deleteEvent(eventId) {
    return this.request(`/events/${eventId}`, {
      method: 'DELETE'
    });
  }
  

  
  async logHours(hoursData) {
    // Use working endpoint with correct action
    console.log('logHours called with data:', hoursData);
    try {
      // Validate data before sending
      if (!hoursData.hours || isNaN(parseFloat(hoursData.hours))) {
        throw new Error('Hours must be a valid number');
      }
      
      if (!hoursData.description || hoursData.description.trim() === '') {
        throw new Error('Description is required');
      }
      
      // Ensure the data is properly formatted
      const formattedData = {
        hours: parseFloat(hoursData.hours),
        description: hoursData.description.trim(),
        date: hoursData.date || new Date().toISOString().split('T')[0],
        organizationId: hoursData.organizationId || 'default'
      };
      
      console.log('Formatted data to send:', formattedData);
      
      const result = await this.request('/working?action=log-hours', {
        method: 'POST',
        body: JSON.stringify(formattedData)
      });
      
      console.log('logHours result:', result);
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to log hours');
      }
      
      return result;
    } catch (error) {
      console.error('logHours error:', error);
      throw error;
    }
  }
  
  async getHours() {
    // Use working endpoint with correct action
    const organizationId = localStorage.getItem('currentOrganization') || 'default';
    return this.request(`/working?action=get-hours&organizationId=${organizationId}`);
  }
  
  // Analytics - use real analytics endpoint
  async getAnalytics(timeRange = 'month') {
    const organizationId = localStorage.getItem('currentOrganization') || 'default';
    return this.request(`/working?action=get-analytics&organizationId=${organizationId}&timeRange=${timeRange}`);
  }
  
  async exportAnalytics(exportData) {
    // Analytics export not implemented yet
    return { success: true, message: 'Export not implemented yet' };
  }
  
  // Stats
  async getStats() {
    // Use working endpoint with correct action
    const organizationId = localStorage.getItem('currentOrganization') || 'default';
    const response = await this.request(`/working?action=get-stats&organizationId=${organizationId}`);
    
    // Ensure consistent data structure
    if (response && response.success) {
      return {
        success: true,
        stats: response.stats || {},
        data: response.stats || {}
      };
    }
    
    // Fallback to main server endpoint
    try {
      const mainResponse = await this.request('/stats');
      return {
        success: true,
        stats: mainResponse.data || {},
        data: mainResponse.data || {}
      };
    } catch (error) {
      console.error('Failed to get stats from main endpoint:', error);
      return {
        success: false,
        stats: { totalHours: 0, totalMembers: 1, activeProjects: 0, completedTasks: 0 },
        data: { totalHours: 0, totalMembers: 1, activeProjects: 0, completedTasks: 0 }
      };
    }
  }
  
  // User Activity - not implemented yet
  async getUserActivity() {
    return { activities: [] };
  }
  
  // Debug and utility methods
  async fixOrganizations() {
    // Not implemented yet
    return { success: true, message: 'Not implemented yet' };
  }
  
  async debugOrganization(orgId) {
    // Not implemented yet
    return { success: true, message: 'Not implemented yet' };
  }
  
  getAuthToken() {
    return this.token;
  }
  
  // Test method to verify endpoints are working
  async testWorking() {
    return this.request('/working?action=test');
  }
  
  // Test the working endpoint specifically
  async testWorkingEndpoint() {
    return this.request('/working?action=test');
  }

  // Quick test to verify API connectivity
  async quickTest() {
    try {
      const response = await this.request('/working?action=test');
      console.log('API Test Result:', response);
      return response;
    } catch (error) {
      console.error('API Test Failed:', error);
      throw error;
    }
  }

  // Test hours logging directly
  async testLogHours() {
    try {
      const testData = {
        hours: 2.5,
        description: 'Test hours logging from browser',
        date: new Date().toISOString().split('T')[0],
        organizationId: 'default'
      };
      
      console.log('Testing logHours with:', testData);
      const response = await this.logHours(testData);
      console.log('Test logHours Result:', response);
      return response;
    } catch (error) {
      console.error('Test logHours Failed:', error);
      throw error;
    }
  }
}

export default new ApiService();
