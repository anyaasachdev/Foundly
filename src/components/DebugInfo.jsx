import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const DebugInfo = ({ user }) => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const runDebug = async () => {
    setLoading(true);
    setMessage('');
    try {
      const currentOrgId = localStorage.getItem('currentOrganization');
      
      // Get organizations
      const orgs = await ApiService.getMyOrganizations();
      
      // Get stats
      const stats = await ApiService.getStats();
      
      // Get analytics
      const analytics = await ApiService.getAnalytics();
      
      // Debug current organization if available
      let orgDebug = null;
      if (currentOrgId) {
        try {
          orgDebug = await ApiService.debugOrganization(currentOrgId);
        } catch (error) {
          orgDebug = { error: error.message };
        }
      }
      
      setDebugData({
        currentOrgId,
        organizations: orgs,
        stats,
        analytics,
        orgDebug,
        localStorage: {
          authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing',
          user: localStorage.getItem('user') ? 'Present' : 'Missing',
          currentOrganization: localStorage.getItem('currentOrganization')
        }
      });
    } catch (error) {
      setMessage('Debug failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixOrganizations = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await ApiService.fixOrganizations();
      setMessage(`Fixed ${result.totalFixed} organization issues`);
      await runDebug(); // Refresh debug data
    } catch (error) {
      setMessage('Fix failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Debug Information</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDebug}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Run Debug'}
        </button>
        
        <button 
          onClick={fixOrganizations}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Fix Organizations
        </button>
      </div>
      
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '5px',
          color: '#92400E'
        }}>
          {message}
        </div>
      )}
      
      {debugData && (
        <div style={{ textAlign: 'left' }}>
          <h3>Current Organization ID</h3>
          <pre>{debugData.currentOrgId || 'None'}</pre>
          
          <h3>Local Storage</h3>
          <pre>{JSON.stringify(debugData.localStorage, null, 2)}</pre>
          
          <h3>Organizations ({debugData.organizations?.length || 0})</h3>
          <pre>{JSON.stringify(debugData.organizations, null, 2)}</pre>
          
          <h3>Stats</h3>
          <pre>{JSON.stringify(debugData.stats, null, 2)}</pre>
          
          <h3>Analytics Overview</h3>
          <pre>{JSON.stringify(debugData.analytics?.data?.overview, null, 2)}</pre>
          
          {debugData.orgDebug && (
            <>
              <h3>Organization Debug</h3>
              <pre>{JSON.stringify(debugData.orgDebug, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 