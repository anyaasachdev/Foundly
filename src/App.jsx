import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import TestHomeScreen from './components/TestHomeScreen';
import SimpleHomeScreen from './components/SimpleHomeScreen';
import ProjectsScreen from './components/ProjectsScreen';
import CalendarScreen from './components/CalendarScreen';
import StatsScreen from './components/StatsScreen';
import ProfileScreen from './components/ProfileScreen';
import OrganizationSetup from './components/OrganizationSetup';
import Navbar from './components/Navbar';
import SimpleNavbar from './components/SimpleNavbar';
import ErrorBoundary from './components/ErrorBoundary';
import ApiService from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 App component mounted');
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      console.log('🔍 Checking authentication...');
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      console.log('🔍 Auth check - Token exists:', !!token);
      console.log('🔍 Auth check - User data exists:', !!userData);
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('🔍 Auth check - User parsed successfully:', parsedUser.email);
          setUser(parsedUser);
        } catch (error) {
          console.error('🔍 Auth check - Failed to parse user data:', error);
          logout();
        }
      } else {
        console.log('🔍 Auth check - No stored auth data found');
      }
    } catch (error) {
      console.error('🔍 Auth check - Error during auth check:', error);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      console.log('🔍 Login handler - Setting user:', userData.email);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('🔍 Login handler - Error:', error);
      setError('Failed to complete login');
    }
  };

  const handleLogout = () => {
    console.log('🔍 Logout handler - Logging out user');
    logout();
  };

  const logout = () => {
    setUser(null);
    setError(null);
    ApiService.clearToken();
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrganization');
    console.log('🔍 Logout - Cleared all auth data');
  };

  const handleOrganizationSetup = () => {
    console.log('🔍 Organization setup handler - Refreshing auth');
    checkAuth();
  };

  if (loading) {
    console.log('🔍 App - Showing loading screen');
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading Foundly...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('🔍 App - Showing error screen:', error);
    return (
      <div className="app">
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid red',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          textAlign: 'center'
        }}>
          <h2 style={{ color: 'red' }}>🚨 Application Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 App - Rendering main app, user:', user?.email || 'not logged in');

  return (
    <Router>
      <div className="app">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <main className={user ? 'main-content' : 'main-content-full'}>
          <ErrorBoundary>
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
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;