import React, { useState } from 'react';

const DebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState({});

  const getDebugInfo = () => {
    const info = {
      user: localStorage.getItem('user'),
      authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing',
      currentOrganization: localStorage.getItem('currentOrganization'),
      refreshToken: localStorage.getItem('refreshToken') ? 'Present' : 'Missing',
      parsedUser: null,
      userOrganizations: null
    };

    try {
      if (info.user) {
        info.parsedUser = JSON.parse(info.user);
        info.userOrganizations = info.parsedUser.organizations || [];
      }
    } catch (error) {
      info.parseError = error.message;
    }

    setDebugInfo(info);
  };

  const clearAll = () => {
    localStorage.clear();
    setDebugInfo({});
    alert('All localStorage cleared. You will be redirected to login.');
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Debug Information</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={getDebugInfo} style={{ marginRight: '10px' }}>Get Debug Info</button>
        <button onClick={clearAll} style={{ backgroundColor: '#ef4444', color: 'white' }}>Clear All Data</button>
      </div>

      {debugInfo.user && (
        <div style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '15px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <h3>LocalStorage Data:</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {debugInfo.userOrganizations && (
        <div style={{ 
          background: '#e0f2fe', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          <h3>User Organizations ({debugInfo.userOrganizations.length}):</h3>
          {debugInfo.userOrganizations.map((org, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '3px' }}>
              <strong>Organization {index + 1}:</strong><br/>
              ID: {org.organizationId?._id || org.organizationId || 'N/A'}<br/>
              Name: {org.organizationId?.name || org.name || 'N/A'}<br/>
              Role: {org.role || 'N/A'}
            </div>
          ))}
        </div>
      )}

      {!debugInfo.user && (
        <div style={{ 
          background: '#fee2e2', 
          padding: '15px', 
          borderRadius: '5px',
          color: '#dc2626'
        }}>
          <h3>No User Data Found</h3>
          <p>No user data found in localStorage. This might be why you're being redirected.</p>
        </div>
      )}
    </div>
  );
};

export default DebugInfo; 