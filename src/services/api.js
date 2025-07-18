import { API_CONFIG } from './config.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get fresh token from localStorage
    const currentToken = localStorage.getItem('authToken');
    
    console.log('🔍 API Request Debug:', {
      baseURL: this.baseURL,
      endpoint,
      fullURL: url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      hasToken: !!currentToken
    });
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('📡 Making request to:', url);
      const response = await fetch(url, config);
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        // Log the actual response text for debugging
        const responseText = await response.text();
        console.error('❌ Non-JSON response received:', responseText.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType}. Status: ${response.status}. Response: ${responseText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log('✅ JSON data received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Organization methods - Updated to use correct endpoints
  async createOrganization(organizationData) {
    return this.request('/organizations', {
      method: 'POST',
      body: JSON.stringify(organizationData),
    });
  }

  async joinOrganization(joinCode) {
    return this.request('/organizations/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    });
  }

  async getOrganizations() {
    return this.request('/organizations');
  }

  async getMyOrganizations() {
    return this.request('/organizations');
  }

  async switchOrganization(orgId) {
    return this.request(`/organizations/switch/${orgId}`, {
      method: 'PUT',
    });
  }

  async leaveOrganization(orgId) {
    return this.request(`/organizations/${orgId}/leave`, {
      method: 'DELETE',
    });
  }

  // Project methods - Updated to use correct endpoints
  async createProject(title, description, dueDate) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description, dueDate }),
    });
  }

  async getProjects() {
    return this.request('/projects');
  }

  // Event methods - Updated to use correct endpoints
  async createEvent(title, description, date, time) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ title, description, date, time }),
    });
  }

  async getEvents() {
    return this.request('/events');
  }

  // Hours methods - Updated to use correct endpoints
  async logHours(projectId, hours, description, date) {
    return this.request('/hours', {
      method: 'POST',
      body: JSON.stringify({ projectId, hours, description, date }),
    });
  }

  async getHours() {
    return this.request('/hours');
  }

  // Stats methods - Updated to use correct endpoints
  async getStats() {
    return this.request('/stats');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();
