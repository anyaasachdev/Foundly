class ApiService {
  constructor() {
    // Use Vercel deployment URL for API calls
    this.baseURL = process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api';
    this.refreshPromise = null;
    this.version = Date.now() + Math.random(); // Force cache refresh with random
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
    const url = `${this.baseURL}${endpoint}?_v=${this.version}`;
    const token = this.token;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
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
    // Temporary: use auth endpoint since organizations endpoint is not working
    return this.request('/auth?action=create-org', {
      method: 'POST',
      body: JSON.stringify(organizationData)
    });
  }
  
  async joinOrganization(joinCode) {
    // Temporary: use auth endpoint since organizations endpoint is not working
    return this.request('/auth?action=join-org', {
      method: 'POST',
      body: JSON.stringify({ joinCode })
    });
  }
  
  async getMyOrganizations() {
    // Temporary: use auth endpoint since organizations endpoint is not working
    return this.request('/auth?action=get-orgs');
  }
  
  async switchOrganization(organizationId) {
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
    // Temporary: use simple test endpoint
    console.log('Calling simple-test endpoint with data:', announcementData);
    return this.request('/simple-test', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  }
  
  async getAnnouncements() {
    // Temporary: use simple test endpoint
    return this.request('/simple-test');
  }
  
  async markAnnouncementRead(announcementId) {
    return this.request(`/announcements/${announcementId}/read`, {
      method: 'POST'
    });
  }
  
  // Messages
  async getMessages() {
    return this.request('/messages');
  }
  
  async sendMessage(recipientId, content) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipient: recipientId, content })
    });
  }
  
  // Users
  async getUsers() {
    return this.request('/users');
  }
  
  async updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }
  
  // Projects
  async getProjects() {
    // Use working endpoint
    return this.request('/working?action=get-projects');
  }
  
  async createProject(projectData) {
    // Use working endpoint
    return this.request('/working?action=create-project', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }
  
  async updateProject(projectId, projectData) {
    return this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  }
  
  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  }
  
  // Events
  async getEvents() {
    // Use working endpoint
    return this.request('/working?action=get-events');
  }
  
  async createEvent(eventData) {
    // Use working endpoint
    return this.request('/working?action=create-event', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
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
    // Use working endpoint
    return this.request('/working?action=log-hours', {
      method: 'POST',
      body: JSON.stringify(hoursData)
    });
  }
  
  async getHours() {
    // Use working endpoint
    return this.request('/working?action=get-hours');
  }
  
  // Analytics
  async getAnalytics(timeRange = 'month') {
    return this.request(`/analytics?timeRange=${timeRange}`);
  }
  
  async exportAnalytics(exportData) {
    return this.request('/analytics/export', {
      method: 'POST',
      body: JSON.stringify(exportData)
    });
  }
  
  // Stats
  async getStats() {
    // Use working endpoint
    return this.request('/working?action=get-stats');
  }
  
  // User Activity
  async getUserActivity() {
    return this.request('/user/activity');
  }
  
  // Debug and utility methods
  async fixOrganizations() {
    return this.request('/user/fix-organizations', {
      method: 'POST'
    });
  }
  
  async debugOrganization(orgId) {
    return this.request(`/debug/organization/${orgId}`);
  }
  
  getAuthToken() {
    return this.token;
  }
  
  // Test method to verify endpoints are working
  async testWorking() {
    return this.request('/test-working');
  }
}

export default new ApiService();
