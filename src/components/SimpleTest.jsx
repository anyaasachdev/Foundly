import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

function SimpleTest() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Basic connectivity
      addResult('Basic Test', true, 'Starting comprehensive API tests...');

      // Test 2: Test endpoint
      try {
        const testResponse = await ApiService.testWorkingEndpoint();
        addResult('Test Endpoint', true, 'Working endpoint accessible', testResponse);
      } catch (error) {
        addResult('Test Endpoint', false, `Failed: ${error.message}`);
      }

      // Test 3: Organizations
      try {
        const orgResponse = await ApiService.getMyOrganizations();
        addResult('Get Organizations', true, 'Organizations loaded', orgResponse);
      } catch (error) {
        addResult('Get Organizations', false, `Failed: ${error.message}`);
      }

      // Test 4: Create announcement
      try {
        const announcementData = {
          title: 'Test Announcement',
          content: 'This is a test announcement',
          organizationId: 'test'
        };
        const announcementResponse = await ApiService.createAnnouncement(announcementData);
        addResult('Create Announcement', true, 'Announcement created', announcementResponse);
      } catch (error) {
        addResult('Create Announcement', false, `Failed: ${error.message}`);
      }

      // Test 5: Get announcements
      try {
        const announcementsResponse = await ApiService.getAnnouncements();
        addResult('Get Announcements', true, 'Announcements loaded', announcementsResponse);
      } catch (error) {
        addResult('Get Announcements', false, `Failed: ${error.message}`);
      }

      // Test 6: Log hours
      try {
        const hoursData = {
          hours: 2,
          description: 'Test hours',
          date: new Date().toISOString().split('T')[0],
          organizationId: 'test'
        };
        const hoursResponse = await ApiService.logHours(hoursData);
        addResult('Log Hours', true, 'Hours logged', hoursResponse);
      } catch (error) {
        addResult('Log Hours', false, `Failed: ${error.message}`);
      }

      // Test 7: Get hours
      try {
        const getHoursResponse = await ApiService.getHours();
        addResult('Get Hours', true, 'Hours loaded', getHoursResponse);
      } catch (error) {
        addResult('Get Hours', false, `Failed: ${error.message}`);
      }

      // Test 8: Create project
      try {
        const projectData = {
          title: 'Test Project',
          description: 'This is a test project',
          organizationId: 'test'
        };
        const projectResponse = await ApiService.createProject(projectData);
        addResult('Create Project', true, 'Project created', projectResponse);
      } catch (error) {
        addResult('Create Project', false, `Failed: ${error.message}`);
      }

      // Test 9: Get projects
      try {
        const projectsResponse = await ApiService.getProjects();
        addResult('Get Projects', true, 'Projects loaded', projectsResponse);
      } catch (error) {
        addResult('Get Projects', false, `Failed: ${error.message}`);
      }

      // Test 10: Create event
      try {
        const eventData = {
          title: 'Test Event',
          description: 'This is a test event',
          startDate: new Date().toISOString(),
          organizationId: 'test'
        };
        const eventResponse = await ApiService.createEvent(eventData);
        addResult('Create Event', true, 'Event created', eventResponse);
      } catch (error) {
        addResult('Create Event', false, `Failed: ${error.message}`);
      }

      // Test 11: Get events
      try {
        const eventsResponse = await ApiService.getEvents();
        addResult('Get Events', true, 'Events loaded', eventsResponse);
      } catch (error) {
        addResult('Get Events', false, `Failed: ${error.message}`);
      }

      // Test 12: Get stats
      try {
        const statsResponse = await ApiService.getStats();
        addResult('Get Stats', true, 'Stats loaded', statsResponse);
      } catch (error) {
        addResult('Get Stats', false, `Failed: ${error.message}`);
      }

      // Test 13: Get users (should work now)
      try {
        const usersResponse = await ApiService.getUsers();
        addResult('Get Users', true, 'Users loaded', usersResponse);
      } catch (error) {
        addResult('Get Users', false, `Failed: ${error.message}`);
      }

      // Test 14: Get analytics (should work now)
      try {
        const analyticsResponse = await ApiService.getAnalytics();
        addResult('Get Analytics', true, 'Analytics loaded', analyticsResponse);
      } catch (error) {
        addResult('Get Analytics', false, `Failed: ${error.message}`);
      }

    } catch (error) {
      addResult('Test Suite', false, `Test suite failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>🔧 Foundly API Test Suite</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>API Base URL: {process.env.REACT_APP_API_URL || 'https://foundly-olive.vercel.app/api'}</h3>
        <p>Total Tests: {results.length}</p>
        <p>Passed: {results.filter(r => r.success).length}</p>
        <p>Failed: {results.filter(r => !r.success).length}</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: '15px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
      }}>
        {results.map((result, index) => (
          <div 
            key={index}
            style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: result.success ? '#f8fff8' : '#fff8f8',
              borderLeft: `4px solid ${result.success ? '#28a745' : '#dc3545'}`
            }}
          >
            <h4 style={{ 
              margin: '0 0 10px 0',
              color: result.success ? '#28a745' : '#dc3545'
            }}>
              {result.success ? '✅' : '❌'} {result.test}
            </h4>
            <p style={{ margin: '5px 0', color: '#666' }}>{result.message}</p>
            {result.data && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Data</summary>
                <pre style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
            <small style={{ color: '#999' }}>{result.timestamp}</small>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#666'
        }}>
          <p>Click "Run All Tests" to test all API endpoints</p>
        </div>
      )}
    </div>
  );
}

export default SimpleTest; 