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
    // Check for existing user session
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (savedUser && token) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        ApiService.setToken(token);
        
        // Check if user needs organization setup
        checkOrganizationStatus(userData);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    }
    
    setLoading(false);
  }, []);

  const checkOrganizationStatus = async (userData) => {
    try {
      // Check if user has organizations in their data first
      if (userData.organizations && userData.organizations.length > 0) {
        console.log('Found organizations in user data:', userData.organizations.length);
        setNeedsOrgSetup(false);
        return;
      }
      
      // TEMPORARY: Skip API call to avoid homepage loading issues
      console.log('Skipping organization API check to fix homepage loading');
      setNeedsOrgSetup(false);
      return;
      
      // If no organizations in user data, try to fetch from API
      const response = await ApiService.getMyOrganizations();
      console.log('Organization check response:', response);
      
      // Check if user has any organizations
      const organizations = response?.organizations || response;
      if (!organizations || !organizations.length || organizations.length === 0) {
        console.log('No organizations found, setting needsOrgSetup to true');
        setNeedsOrgSetup(true);
      } else {
        console.log('Organizations found:', organizations.length);
        // User has organizations, ensure one is set as current
        const currentOrgId = localStorage.getItem('currentOrganization');
        if (!currentOrgId && organizations.length > 0) {
          // Set first organization as current
          const firstOrg = organizations[0];
          const orgId = firstOrg._id || firstOrg.organizationId?._id || firstOrg.organizationId;
          console.log('Setting current organization to:', orgId);
          localStorage.setItem('currentOrganization', orgId);
        }
        setNeedsOrgSetup(false);
      }
    } catch (error) {
      console.error('Error checking organization status:', error);
      
      // For new users or API errors, default to organization setup
      console.log('API error or new user, setting needsOrgSetup to true');
      setNeedsOrgSetup(true);
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
    setNeedsOrgSetup(false);
    // Store the organization and navigate properly
    if (result.organization) {
      const orgId = result.organization._id;
      localStorage.setItem('currentOrganization', orgId);
      
      // Update user state with organization info
      setUser(prev => ({
        ...prev,
        organization: result.organization,
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
        organizations: user?.organizations ? [...user.organizations, {
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }] : [{
          organizationId: result.organization,
          role: result.type === 'created' ? 'admin' : 'member'
        }]
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
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
        </div>
      </div>
    );
  }

  // Show organization setup if user is logged in but needs org setup
  if (user && needsOrgSetup) {
    console.log('User needs organization setup, showing OrganizationSetup component');
    return (
      <div className="app">
        <OrganizationSetup onComplete={handleOrganizationSetup} />
      </div>
    );
  }

  console.log('App state - user:', !!user, 'needsOrgSetup:', needsOrgSetup, 'loading:', loading);
  console.log('App version: 2.1 - Full app restored - CACHE REFRESH REQUIRED');

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
                <Route 
                  path="/test" 
                  element={<SimpleTest />} 
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