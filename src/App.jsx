import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import ProjectsScreen from './components/ProjectsScreen';
import CalendarScreen from './components/CalendarScreen';
import StatsScreen from './components/StatsScreen';
import ProfileScreen from './components/ProfileScreen';
import OrganizationSetup from './components/OrganizationSetup';
import Navbar from './components/Navbar';
import ToastNotification from './components/ToastNotification';
import ApiTest from './components/ApiTest';
import DebugInfo from './components/DebugInfo';
import CollapsibleDisclaimer from './components/CollapsibleDisclaimer';
import SimpleTest from './components/SimpleTest';

import { NotificationProvider } from './contexts/NotificationContext';
import ApiService from './services/api';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false);
  const [version] = useState('2.2 - CACHE REFRESH REQUIRED - ' + Date.now());

  // Token refresh mechanism
  useEffect(() => {
    const refreshTokenPeriodically = async () => {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token && refreshToken) {
        try {
          // Check if token is about to expire (refresh every 10 minutes)
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          const tokenExp = tokenData.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          const timeUntilExpiry = tokenExp - now;
          
          // If token expires in less than 5 minutes, refresh it
          if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log('Token expiring soon, refreshing...');
            await ApiService.refreshToken();
          }
        } catch (error) {
          console.error('Token refresh check failed:', error);
        }
      }
    };

    // Check token every 5 minutes
    const interval = setInterval(refreshTokenPeriodically, 5 * 60 * 1000);
    
    // Also check immediately on mount
    refreshTokenPeriodically();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      
      // Check for existing user session
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('authToken');
      
      if (savedUser && token) {
        try {
          const userData = JSON.parse(savedUser);
          console.log('👤 Found saved user:', userData.email);
          setUser(userData);
          ApiService.setToken(token);
          
          // Check if user needs organization setup and wait for it
          await checkOrganizationStatus(userData);
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
        }
      }
      
      console.log('✅ App initialization complete');
      setLoading(false);
    };
    
    initializeApp();
  }, []);

  const checkOrganizationStatus = async (userData) => {
    console.log('🔍 Checking organization status for user:', userData.email);
    console.log('📊 User organizations in data:', userData.organizations?.length || 0);
    console.log('🏢 Current org in localStorage:', localStorage.getItem('currentOrganization'));
    
    try {
      // First check if user has organizations in their stored data
      if (userData.organizations && userData.organizations.length > 0) {
        console.log('✅ Found organizations in user data:', userData.organizations.length);
        
        // Set up the current organization if not already set
        const currentOrgId = localStorage.getItem('currentOrganization');
        if (!currentOrgId) {
          // Set first organization as current
          const firstOrg = userData.organizations[0];
          const orgId = firstOrg.organization?._id || firstOrg.organizationId?._id || firstOrg.organizationId;
          if (orgId) {
            console.log('🎯 Setting current organization to:', orgId);
            localStorage.setItem('currentOrganization', orgId);
          }
        }
        
        console.log('✅ User has organizations, skipping org setup');
        setNeedsOrgSetup(false);
        return;
      }
      
      // Also check if there's a currentOrganization set (fallback)
      const currentOrgId = localStorage.getItem('currentOrganization');
      if (currentOrgId) {
        console.log('✅ Found currentOrganization in localStorage, skipping org setup');
        setNeedsOrgSetup(false);
        return;
      }
      
      // Test API connectivity before making requests
      try {
        await ApiService.quickTest();
        console.log('✅ API is working correctly');
      } catch (apiError) {
        console.error('❌ API test failed:', apiError);
        // If API is down but user has stored org data, don't force org setup
        if (userData.organizations?.length > 0 || currentOrgId) {
          console.log('🔄 API down but user has org data, skipping org setup');
          setNeedsOrgSetup(false);
          return;
        }
      }
      
      // If no organizations in user data, try to fetch from API
      console.log('🌐 Fetching organizations from API...');
      const response = await ApiService.getMyOrganizations();
      console.log('📡 Organization API response:', response);
      
      // Check if user has any organizations
      const organizations = response?.organizations || response;
      if (!organizations || !organizations.length || organizations.length === 0) {
        console.log('❌ No organizations found, user needs org setup');
        setNeedsOrgSetup(true);
      } else {
        console.log('✅ Organizations found via API:', organizations.length);
        // User has organizations, ensure one is set as current
        const existingOrgId = localStorage.getItem('currentOrganization');
        if (!existingOrgId && organizations.length > 0) {
          // Set first organization as current
          const firstOrg = organizations[0];
          const orgId = firstOrg._id || firstOrg.organizationId?._id || firstOrg.organizationId;
          console.log('🎯 Setting current organization from API to:', orgId);
          localStorage.setItem('currentOrganization', orgId);
        }
        setNeedsOrgSetup(false);
      }
    } catch (error) {
      console.error('❌ Error checking organization status:', error);
      
      // Before defaulting to org setup, check if user has any org indicators
      const currentOrgId = localStorage.getItem('currentOrganization');
      const hasStoredOrgs = userData.organizations?.length > 0;
      
      if (hasStoredOrgs || currentOrgId) {
        console.log('🔄 Error occurred but user has org data, skipping org setup');
        setNeedsOrgSetup(false);
      } else {
        console.log('❌ Error occurred and no org data found, showing org setup');
        setNeedsOrgSetup(true);
      }
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    await checkOrganizationStatus(userData);
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setNeedsOrgSetup(false);
      localStorage.removeItem('refreshToken');
    }
  };

  const handleOrganizationSetup = (result) => {
    console.log('Organization setup completed:', result);
    setNeedsOrgSetup(false);
    
    // Store the organization and navigate properly
    if (result.organization) {
      const orgId = result.organization._id;
      console.log('Setting current organization to:', orgId, result.organization.name);
      localStorage.setItem('currentOrganization', orgId);
      
      // Clear any cached data so new org data loads fresh
      localStorage.removeItem('cachedProjects');
      localStorage.removeItem('cachedStats');
      
      // Update user state with organization info
      setUser(prev => ({
        ...prev,
        organization: result.organization,
        currentOrganization: orgId,
        organizations: prev?.organizations ? [...prev.organizations, {
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }] : [{
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }]
      }));
      
      // Store updated user data in localStorage
      const updatedUser = {
        ...user,
        organization: result.organization,
        currentOrganization: orgId,
        organizations: user?.organizations ? [...user.organizations, {
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }] : [{
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }]
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      console.log('Organization setup complete, redirecting to dashboard...');
      // Navigate to home page to show the new organization
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Foundly...</p>
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
              <p>Debug: Checking user session and organizations...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show organization setup if user is logged in but needs org setup
  if (user && needsOrgSetup) {
    console.log('🚨 SHOWING ORG SETUP - User needs organization setup');
    console.log('👤 User email:', user.email);
    console.log('📊 User organizations:', user.organizations?.length || 0);
    console.log('🏢 Current org ID:', localStorage.getItem('currentOrganization'));
    console.log('🎭 Needs org setup:', needsOrgSetup);
    
    return (
      <div className="app">
        <OrganizationSetup onComplete={handleOrganizationSetup} />
      </div>
    );
  }

  // Debug output before rendering main app
  console.log('🏠 RENDERING MAIN APP');
  console.log('👤 User:', !!user, user?.email || 'none');
  console.log('🎭 Needs org setup:', needsOrgSetup);
  console.log('⏳ Loading:', loading);
  console.log('📊 User orgs:', user?.organizations?.length || 0);
  console.log('🏢 Current org:', localStorage.getItem('currentOrganization'));
  console.log('🔖 App version:', version);

  return (
    <ErrorBoundary>
      <NotificationProvider user={user}>
        <Router>
          <div className="app">
            {user && <Navbar user={user} onLogout={handleLogout} />}
            <main className={user ? 'main-content' : 'main-content-full'}>
              <Routes>
                <Route 
                  path="/login" 
                  element={!user ? <LoginScreen onLogin={handleLogin} /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/" 
                  element={user ? <HomeScreen user={user} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/projects" 
                  element={user ? <ProjectsScreen user={user} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/calendar" 
                  element={user ? <CalendarScreen user={user} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/stats" 
                  element={user ? <StatsScreen user={user} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/profile" 
                  element={user ? <ProfileScreen user={user} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/organization/create" 
                  element={user ? <OrganizationSetup onComplete={handleOrganizationSetup} /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/api-test" 
                  element={user ? <ApiTest /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="/debug" 
                  element={user ? <DebugInfo /> : <Navigate to="/login" />} 
                />
                <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
              </Routes>
            </main>
            <ToastNotification />
            <CollapsibleDisclaimer />
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;