import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const SimpleTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runBasicTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test 1: Basic API connectivity
      console.log('Testing basic API connectivity...');
      const basicTest = await fetch('https://foundly-olive.vercel.app/api/test');
      const basicData = await basicTest.json();
      results.basic = { success: basicTest.ok, data: basicData, status: basicTest.status };
    } catch (error) {
      results.basic = { success: false, error: error.message };
    }

    try {
      // Test 2: Auth endpoint
      console.log('Testing auth endpoint...');
      const authTest = await fetch('https://foundly-olive.vercel.app/api/auth?action=test');
      const authData = await authTest.json();
      results.auth = { success: authTest.ok, data: authData, status: authTest.status };
    } catch (error) {
      results.auth = { success: false, error: error.message };
    }

    try {
      // Test 3: Working endpoint
      console.log('Testing working endpoint...');
      const workingTest = await fetch('https://foundly-olive.vercel.app/api/working?action=test');
      const workingData = await workingTest.json();
      results.working = { success: workingTest.ok, data: workingData, status: workingTest.status };
    } catch (error) {
      results.working = { success: false, error: error.message };
    }

    try {
      // Test 4: ApiService initialization
      console.log('Testing ApiService...');
      results.apiService = { 
        success: true, 
        baseURL: ApiService.baseURL,
        token: ApiService.token ? 'Present' : 'Missing'
      };
    } catch (error) {
      results.apiService = { success: false, error: error.message };
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runBasicTests();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f5f5f5', 
      margin: '20px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '14px'
    }}>
      <h2>🔧 Debug Test Results</h2>
      <button 
        onClick={runBasicTests} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          marginBottom: '20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>

      <div>
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} style={{ 
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            <strong>{testName}:</strong> {result.success ? '✅ SUCCESS' : '❌ FAILED'}
            {result.success ? (
              <pre style={{ marginTop: '5px', fontSize: '12px' }}>
                {JSON.stringify(result.data || result, null, 2)}
              </pre>
            ) : (
              <div style={{ marginTop: '5px', color: '#721c24' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e2e3e5' }}>
        <strong>Environment Info:</strong>
        <div>API URL: {process.env.REACT_APP_API_URL || 'Not set'}</div>
        <div>Node Env: {process.env.NODE_ENV}</div>
        <div>Timestamp: {new Date().toISOString()}</div>
      </div>
    </div>
  );
};

export default SimpleTest; 