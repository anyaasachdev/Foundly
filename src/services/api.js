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
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
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

  // Organization methods
  async createOrganization(organizationData) {
    return this.request('/working?action=organizations', {
      method: 'POST',
      body: JSON.stringify(organizationData),
    });
  }

  async joinOrganization(joinCode) {
    return this.request('/working?action=organizations', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: joinCode }),
    });
  }

  async getOrganizations() {
    return this.request('/working?action=organizations');
  }

  async getMyOrganizations() {
    return this.request('/working?action=organizations');
  }

  async switchOrganization(orgId) {
    return this.request(`/organizations/switch/${orgId}`, {
      method: 'PUT',
    });
  }

  // Project methods
  async createProject(title, description, dueDate) {
    return this.request('/working?action=projects', {
      method: 'POST',
      body: JSON.stringify({ title, description, dueDate }),
    });
  }

  async getProjects() {
    return this.request('/working?action=projects');
  }

  // Event methods
  async createEvent(title, description, date, time) {
    return this.request('/working?action=events', {
      method: 'POST',
      body: JSON.stringify({ title, description, date, time }),
    });
  }

  async getEvents() {
    return this.request('/working?action=events');
  }

  // Hours methods
  async logHours(projectId, hours, description, date) {
    return this.request('/working?action=log-hours', {
      method: 'POST',
      body: JSON.stringify({ projectId, hours, description, date }),
    });
  }

  async getHours() {
    return this.request('/working?action=hours');
  }

  // Stats methods
  async getStats() {
    return this.request('/working?action=stats');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();
