import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import TestHomeScreen from './components/TestHomeScreen';
import SimpleHomeScreen from './components/SimpleHomeScreen';
import SimpleTest from './components/SimpleTest';
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
  console.log('🚀 App component rendering...');
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 App component mounted');
    
    // Simple test - just set loading to false after 2 seconds
    const timer = setTimeout(() => {
      console.log('🔍 App - Setting loading to false');
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  console.log('🔍 App render state:', { loading, user: !!user, error: !!error });

  if (loading) {
    console.log('🔍 App - Showing loading screen');
    return (
      <div className="app" style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Foundly...</p>
          <p style={{ fontSize: '14px', color: '#666' }}>Debug: Loading state active</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('🔍 App - Showing error screen:', error);
    return (
      <div className="app" style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
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

  console.log('🔍 App - Rendering main app');

  return (
    <div className="app" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      <h1 style={{ padding: '20px', color: '#1e3a8a' }}>✅ Foundly App is Working!</h1>
      <p style={{ padding: '0 20px', color: '#333' }}>
        If you can see this, React is working correctly. The app is now ready to show the full interface.
      </p>
      <div style={{ padding: '20px' }}>
        <button 
          onClick={() => setLoading(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1e3a8a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Loading State
        </button>
        <button 
          onClick={() => setError('Test error message')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Error State
        </button>
      </div>
    </div>
  );
}

export default App;