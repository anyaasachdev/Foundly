class ApiService {
  constructor() {
    // Use Vercel deployment URL for API calls
    this.baseURL = process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api';
    this.refreshPromise = null;
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
    const url = `${this.baseURL}${endpoint}`;
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
  
  async validateToken(token) {
    try {
      const response = await fetch(`${this.baseURL}/auth?action=validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
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
    return this.request('/organizations', {
      method: 'POST',
      body: JSON.stringify(organizationData)
    });
  }
  
  async joinOrganization(joinCode) {
    return this.request('/organizations/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode })
    });
  }
  
  async getMyOrganizations() {
    return this.request('/organizations/my');
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
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  }
  
  async getAnnouncements() {
    return this.request('/announcements');
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
    return this.request('/projects');
  }
  
  async createProject(projectData) {
    return this.request('/projects', {
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
    return this.request('/events');
  }
  
  async createEvent(eventData) {
    return this.request('/events', {
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
  
  // Hours
  async getHours() {
    return this.request('/hours');
  }
  
  async logHours(hoursData) {
    return this.request('/hours', {
      method: 'POST',
      body: JSON.stringify(hoursData)
    });
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
    return this.request('/stats');
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
}

export default new ApiService();
