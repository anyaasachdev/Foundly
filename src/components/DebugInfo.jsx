import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const DebugInfo = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [orgDebugInfo, setOrgDebugInfo] = useState(null);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test basic connectivity with simple endpoint
      console.log('Testing basic connectivity...');
      const basicTest = await ApiService.request('/simple-test');
      results.basic = { success: true, data: basicTest };
    } catch (error) {
      results.basic = { success: false, error: error.message };
    }

    try {
      // Test working endpoint directly
      console.log('Testing working endpoint...');
      const workingTest = await ApiService.request('/working?action=test');
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

    try {
      // Test organizations
      console.log('Testing organizations...');
      const orgsTest = await ApiService.getMyOrganizations();
      results.organizations = { success: true, data: orgsTest };
    } catch (error) {
      results.organizations = { success: false, error: error.message };
    }

    setTestResults(results);
    setLoading(false);
  };

  const debugOrganizationStatus = () => {
    const user = localStorage.getItem('user');
    const currentOrg = localStorage.getItem('currentOrganization');
    const authToken = localStorage.getItem('authToken');
    const userOrgData = localStorage.getItem('userOrganizationData');
    
    let userData = null;
    try {
      userData = user ? JSON.parse(user) : null;
    } catch (e) {
      userData = null;
    }

    let orgPref = null;
    try {
      orgPref = userOrgData ? JSON.parse(userOrgData) : null;
    } catch (e) {
      orgPref = null;
    }

    const debugInfo = {
      user: {
        exists: !!userData,
        email: userData?.email,
        organizationsCount: userData?.organizations?.length || 0,
        organizations: userData?.organizations?.map(org => ({
          name: org.organization?.name || 'Unknown',
          id: org.organization?._id || org.organizationId,
          role: org.role
        })) || []
      },
      localStorage: {
        currentOrg: currentOrg || 'Not set',
        authToken: authToken ? 'Present' : 'Missing',
        userOrgData: orgPref ? {
          userEmail: orgPref.userEmail,
          organizationId: orgPref.organizationId,
          organizationName: orgPref.organizationName,
          role: orgPref.role,
          setAt: orgPref.setAt
        } : 'Not set'
      },
      analysis: {
        hasUserOrganizations: userData?.organizations && userData.organizations.length > 0,
        hasStoredOrgId: !!currentOrg,
        hasOrgPreference: !!userOrgData,
        shouldSkipOrgSetup: !!(userData?.organizations?.length > 0 || currentOrg || userOrgData),
        wouldShowWelcomePage: !(userData?.organizations?.length > 0 || currentOrg || userOrgData)
      }
    };

    setOrgDebugInfo(debugInfo);
  };

  useEffect(() => {
    runTests();
    debugOrganizationStatus();
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
      
      <div style={{ marginBottom: '30px' }}>
        <h4>Organization Status Debug</h4>
        <button 
          onClick={debugOrganizationStatus} 
          style={{ 
            padding: '10px 20px', 
            marginBottom: '20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Org Debug
        </button>

        {orgDebugInfo && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '15px', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h5>User Data:</h5>
            <pre>{JSON.stringify(orgDebugInfo.user, null, 2)}</pre>
            
            <h5>LocalStorage:</h5>
            <pre>{JSON.stringify(orgDebugInfo.localStorage, null, 2)}</pre>
            
            <h5>Analysis:</h5>
            <div style={{ 
              padding: '10px', 
              backgroundColor: orgDebugInfo.analysis.wouldShowWelcomePage ? '#f8d7da' : '#d4edda',
              border: `1px solid ${orgDebugInfo.analysis.wouldShowWelcomePage ? '#f5c6cb' : '#c3e6cb'}`,
              borderRadius: '4px',
              marginBottom: '10px'
            }}>
              <strong>Would show "Welcome to Foundly" page:</strong> {orgDebugInfo.analysis.wouldShowWelcomePage ? '❌ YES (PROBLEM)' : '✅ NO (CORRECT)'}
            </div>
            <pre>{JSON.stringify(orgDebugInfo.analysis, null, 2)}</pre>
          </div>
        )}
      </div>

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
        {loading ? 'Testing...' : 'Run API Tests'}
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
        <div>API URL: {process.env.REACT_APP_API_URL || 'Not set'}</div>
        <div>Node Env: {process.env.NODE_ENV}</div>
        <div>Timestamp: {new Date().toISOString()}</div>
      </div>
    </div>
  );
};

export default DebugInfo; 