import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const DebugInfo = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test basic connectivity
      console.log('Testing basic connectivity...');
      const basicTest = await ApiService.testWorking();
      results.basic = { success: true, data: basicTest };
    } catch (error) {
      results.basic = { success: false, error: error.message };
    }

    try {
      // Test working endpoint
      console.log('Testing working endpoint...');
      const workingTest = await ApiService.testWorkingEndpoint();
      results.working = { success: true, data: workingTest };
    } catch (error) {
      results.working = { success: false, error: error.message };
    }

    try {
      // Test announcements
      console.log('Testing announcements...');
      const announcementsTest = await ApiService.getAnnouncements();
      results.announcements = { success: true, data: announcementsTest };
    } catch (error) {
      results.announcements = { success: false, error: error.message };
    }

    try {
      // Test projects
      console.log('Testing projects...');
      const projectsTest = await ApiService.getProjects();
      results.projects = { success: true, data: projectsTest };
    } catch (error) {
      results.projects = { success: false, error: error.message };
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
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
      <h3>Debug Information</h3>
      <button 
        onClick={runTests} 
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
                {JSON.stringify(result.data, null, 2)}
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
        <div>API URL: {process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api'}</div>
        <div>Node Env: {process.env.NODE_ENV}</div>
        <div>Timestamp: {new Date().toISOString()}</div>
      </div>
    </div>
  );
};

export default DebugInfo; 