import React from 'react';

const SimpleTest = () => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'white',
      color: 'black',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px'
    }}>
      <h1 style={{ color: '#1e3a8a', marginBottom: '20px' }}>✅ React App is Working!</h1>
      <p>If you can see this, the React app is loading correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <p><strong>Debug Info:</strong></p>
        <p>User Agent: {navigator.userAgent}</p>
        <p>Window Size: {window.innerWidth} x {window.innerHeight}</p>
        <p>LocalStorage: {localStorage.getItem('user') ? 'Has user data' : 'No user data'}</p>
      </div>
    </div>
  );
};

export default SimpleTest; 