class AuthService {
  // Get the API base URL from environment or fallback to localhost
  getApiUrl() {
    return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
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

  // Login user
  async login(email, password) {
    try {
      const response = await fetch(`${this.getApiUrl()}/auth?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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
          error: data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
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
