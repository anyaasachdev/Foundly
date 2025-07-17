import React from 'react';
import { Link } from 'react-router-dom';

const SimpleNavbar = ({ user, onLogout }) => {
  return (
    <nav style={{
      backgroundColor: '#1E3A8A',
      color: 'white',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
          🏠 Foundly
        </Link>
        <Link to="/projects" style={{ color: 'white', textDecoration: 'none' }}>
          📁 Projects
        </Link>
        <Link to="/calendar" style={{ color: 'white', textDecoration: 'none' }}>
          📅 Calendar
        </Link>
        <Link to="/stats" style={{ color: 'white', textDecoration: 'none' }}>
          📊 Stats
        </Link>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>👤 {user?.name || user?.email || 'User'}</span>
        <button 
          onClick={onLogout}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid white',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default SimpleNavbar; 