import React, { useState } from 'react';

const DebugConnection = () => {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const testConnection = async () => {
    setStatus('Testing...');
    setError('');
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    console.log('Testing connection to:', apiUrl);
    
    try {
      // First test the health endpoint
      const healthResponse = await fetch(`${apiUrl}/health`);
      console.log('Health response status:', healthResponse.status);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('Health data:', healthData);
        setStatus('✅ Health check successful! Backend is running.');
      } else {
        const healthText = await healthResponse.text();
        setError(`❌ Health check failed: ${healthResponse.status} - ${healthText}`);
        return;
      }
      
      // Then test the auth endpoint
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.status === 401) {
        setStatus('✅ Connection successful! (Got 401 as expected for invalid credentials)');
      } else if (response.ok) {
        setStatus('✅ Connection successful!');
      } else {
        const data = await response.text();
        setError(`❌ Server error: ${response.status} - ${data}`);
      }
    } catch (err) {
      console.error('Connection failed:', err);
      setError(`❌ Network error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>Debug Connection</h3>
      <p><strong>REACT_APP_API_URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</p>
      <p><strong>Fallback URL:</strong> http://localhost:3001/api</p>
      <p><strong>Actual URL being used:</strong> {process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}</p>
      <button onClick={testConnection} style={{ padding: '10px 20px', margin: '10px 0' }}>
        Test Connection
      </button>
      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default DebugConnection; 