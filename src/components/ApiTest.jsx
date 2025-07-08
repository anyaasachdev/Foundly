import React, { useState } from 'react';
import authService from '../services/authService';

function ApiTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Check if auth service is working
      addResult('Auth Service', true, 'Auth service loaded successfully');

      // Test 2: Test login with our test user
      addResult('Login Test', true, 'Attempting login with test@example.com...');
      
      const loginResult = await authService.login('test@example.com', 'password123');
      
      if (loginResult.success) {
        addResult('Login Success', true, 'Login successful!', {
          user: loginResult.user,
          hasToken: !!localStorage.getItem('authToken')
        });
      } else {
        addResult('Login Failed', false, `Login failed: ${loginResult.error}`);
      }

      // Test 3: Check if token is stored
      const token = localStorage.getItem('authToken');
      if (token) {
        addResult('Token Storage', true, 'Auth token stored successfully');
      } else {
        addResult('Token Storage', false, 'No auth token found in localStorage');
      }

    } catch (error) {
      addResult('Test Error', false, `Test failed with error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>API Connection Test</h2>
      <p>This will test the connection between the frontend and backend.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Results:</h3>
        {testResults.length === 0 && (
          <p style={{ color: '#6B7280' }}>No tests run yet. Click "Run Tests" to start.</p>
        )}
        
        {testResults.map((result, index) => (
          <div 
            key={index} 
            style={{
              padding: '10px',
              margin: '5px 0',
              backgroundColor: result.success ? '#D1FAE5' : '#FEE2E2',
              border: `1px solid ${result.success ? '#10B981' : '#EF4444'}`,
              borderRadius: '5px'
            }}
          >
            <strong>{result.test}:</strong> {result.message}
            {result.data && (
              <pre style={{ marginTop: '5px', fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
            <small style={{ color: '#6B7280' }}>
              {new Date(result.timestamp).toLocaleTimeString()}
            </small>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#F3F4F6', borderRadius: '5px' }}>
        <h4>Debug Information:</h4>
        <p><strong>API URL:</strong> {authService.getApiUrl()}</p>
        <p><strong>Auth Token:</strong> {localStorage.getItem('authToken') ? 'Present' : 'Not found'}</p>
        <p><strong>User Data:</strong> {localStorage.getItem('user') ? 'Present' : 'Not found'}</p>
      </div>
    </div>
  );
}

export default ApiTest; 