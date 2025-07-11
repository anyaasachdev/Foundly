import React, { useState } from 'react';
import './LoginScreen.css';
import authService from '../services/authService';

function LoginScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        console.log('🔍 LOGIN DEBUG: Starting login process for:', formData.email);
        result = await authService.login(formData.email, formData.password);
        console.log('🔍 LOGIN DEBUG: Login result:', result);
        
        if (result.success) {
          console.log('🔍 LOGIN DEBUG: Login successful');
          console.log('🔍 LOGIN DEBUG: User data structure:', {
            email: result.user?.email,
            hasOrganizations: !!result.user?.organizations,
            organizationCount: result.user?.organizations?.length || 0,
            organizations: result.user?.organizations || []
          });
          
          // Store complete user data in localStorage including organizations
          localStorage.setItem('user', JSON.stringify(result.user));
          console.log('🔍 LOGIN DEBUG: User data stored in localStorage');
          console.log('🔍 LOGIN DEBUG: User logged in with organizations:', result.user.organizations?.length || 0);
          
          // Check if user has organizations and set current org
          if (result.user.organizations && result.user.organizations.length > 0) {
            const currentOrgId = localStorage.getItem('currentOrganization');
            if (!currentOrgId) {
              const firstOrg = result.user.organizations[0];
              const orgId = firstOrg.organization?._id || firstOrg.organizationId;
              localStorage.setItem('currentOrganization', orgId);
              console.log('🔍 LOGIN DEBUG: Set current organization:', orgId);
            }
          }
          
          onLogin(result.user);
        } else {
          console.log('🔍 LOGIN DEBUG: Login failed:', result.error);
          setError(result.error);
        }
      } else {
        result = await authService.register(formData.email, formData.password, formData.name);
        if (result.success) {
          localStorage.setItem('user', JSON.stringify(result.user));
          onLogin(result.user);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      console.error('🔍 LOGIN DEBUG: Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">⭐</span>
            <span className="logo-text">Foundly</span>
          </div>
          <h1 className="login-title">
            {isLogin ? 'Welcome back!' : 'Join Foundly'}
          </h1>
          <p className="login-subtitle">
            {isLogin 
              ? 'Sign in to continue your impact journey' 
              : 'Start making a difference today'
            }
          </p>
        </div>

        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your full name"
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="form-footer">
          <p className="switch-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button" 
              className="switch-btn"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
