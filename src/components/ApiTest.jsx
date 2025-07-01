import React, { useState } from 'react';
import ApiService from '../services/api';

const ApiTest = () => {
  const [apiUrl, setApiUrl] = useState('');
  const [testResult, setTestResult] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const checkApiUrl = () => {
    const service = new ApiService();
    setApiUrl(service.baseURL);
  };

  const testJoin = async () => {
    try {
      const service = new ApiService();
      const result = await service.joinOrganization(joinCode);
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>API Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={checkApiUrl}>Check API URL</button>
        {apiUrl && <p>API URL: {apiUrl}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Enter join code" 
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button onClick={testJoin}>Test Join</button>
      </div>

      {testResult && (
        <div style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace'
        }}>
          {testResult}
        </div>
      )}
    </div>
  );
};

export default ApiTest; 