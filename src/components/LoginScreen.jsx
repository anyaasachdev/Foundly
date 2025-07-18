import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log('🔍 LoginScreen mounted');
  }, []);

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
      console.log('🔍 LoginScreen - Starting auth process:', isLogin ? 'login' : 'register');
      console.log('🔍 LoginScreen - Form data:', { email: formData.email, hasPassword: !!formData.password, hasName: !!formData.name });
      
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
        console.log('🔍 REGISTER DEBUG: Starting registration process for:', formData.email);
        result = await authService.register(formData.email, formData.password, formData.name);
        console.log('🔍 REGISTER DEBUG: Registration result:', result);
        
        if (result.success) {
          console.log('🔍 REGISTER DEBUG: Registration successful');
          localStorage.setItem('user', JSON.stringify(result.user));
          onLogin(result.user);
        } else {
          console.log('🔍 REGISTER DEBUG: Registration failed:', result.error);
          setError(result.error);
        }
      }
    } catch (error) {
      console.error('🔍 LoginScreen - Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  console.log('🔍 LoginScreen - Rendering, loading:', loading, 'error:', error);

  // FALLBACK: If there's an issue with the form, show a simple version
  return (
    <div className="login-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="login-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '30px', width: '100%' }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '20px' }}>
            <span className="logo-icon" style={{ fontSize: '1.8rem' }}>⭐</span>
            <span className="logo-text" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000000', fontFamily: 'Poppins, sans-serif' }}>Foundly</span>
          </div>
          <h1 className="login-title" style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: '0 0 10px 0', fontFamily: 'Poppins, sans-serif' }}>
            {isLogin ? 'Welcome back!' : 'Join Foundly'}
          </h1>
          <p className="login-subtitle" style={{ color: '#6b7280', margin: '0', fontSize: '1rem', fontFamily: 'Poppins, sans-serif' }}>
            {isLogin 
              ? 'Sign in to continue your impact journey' 
              : 'Start making a difference today'
            }
          </p>
        </div>

        {error && (
          <div className="error-alert" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <span className="error-icon" style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span className="error-text" style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" style={{ marginBottom: '20px', width: '100%' }}>
          {!isLogin && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif' }}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your full name"
                required={!isLogin}
                disabled={loading}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', transition: 'border-color 0.2s ease', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
          )}
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif' }}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your email"
              required
              disabled={loading}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', transition: 'border-color 0.2s ease', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your password"
              required
              disabled={loading}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', transition: 'border-color 0.2s ease', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
            style={{ width: '100%', padding: '12px 24px', background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="form-footer" style={{ textAlign: 'center' }}>
          <p className="switch-text" style={{ color: '#6b7280', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif', margin: '0' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button" 
              className="switch-btn"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: '#374151', fontWeight: '600', cursor: 'pointer', marginLeft: '8px', fontFamily: 'Poppins, sans-serif', transition: 'color 0.2s ease' }}
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
