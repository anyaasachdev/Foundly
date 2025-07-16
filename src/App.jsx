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
import ApiService from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    logout();
  };

  const logout = () => {
    setUser(null);
    ApiService.clearToken();
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrganization');
  };

  const handleOrganizationSetup = () => {
    // Refresh user data after organization setup
    checkAuth();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading Foundly...</p>
        </div>
      </div>
    );
  }

  return (
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;