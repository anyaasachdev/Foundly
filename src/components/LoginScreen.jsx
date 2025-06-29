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
        result = await authService.login(formData.email, formData.password);
      } else {
        result = await authService.register(formData.email, formData.password, formData.name);
      }

      if (result.success) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        onLogin(result.user);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Auth error:', error);
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

      {/* Disclaimer Footer */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #e5e7eb',
        padding: '15px 20px',
        textAlign: 'center',
        zIndex: 100
      }}>
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          lineHeight: '1.4',
          fontFamily: 'Poppins, sans-serif',
          margin: '0',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <strong>Note:</strong> Foundly is a student hobby project created for organizational purposes only. 
          This is a one-person team working on this as a side project - I'm not a professional developer! 
          While I try my best, this app may have bugs or imperfections. By using Foundly, you acknowledge 
          that it's a student project and agree not to hold me liable for any issues or data loss. 
          This is meant for fun organizational use, not critical business operations. Thanks for understanding! 🎓
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;