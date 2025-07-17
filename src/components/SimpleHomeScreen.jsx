import React from 'react';

const SimpleHomeScreen = ({ user }) => {
  console.log('🧪 SimpleHomeScreen: Rendering with user:', user);

  return (
    <div style={{ 
      padding: '20px', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>
        🏠 Welcome to Foundly!
      </h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2>User Information</h2>
        <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
        <p><strong>Name:</strong> {user?.name || 'Not available'}</p>
        <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Status</h2>
        <p style={{ color: 'green' }}>✅ Successfully logged in!</p>
        <p style={{ color: 'blue' }}>🔧 This is a simplified version for testing</p>
        <p>If you can see this, the white page issue is resolved!</p>
      </div>
    </div>
  );
};

export default SimpleHomeScreen; 