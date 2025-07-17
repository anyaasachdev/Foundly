import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const TestHomeScreen = ({ user }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        console.log('🧪 TestHomeScreen: Loading organizations...');
        const response = await ApiService.getMyOrganizations();
        console.log('🧪 TestHomeScreen: Organizations response:', response);
        setOrganizations(response.organizations || []);
      } catch (err) {
        console.error('🧪 TestHomeScreen: Error loading organizations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadOrganizations();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🧪 Testing HomeScreen...</h2>
        <p>Loading organizations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>🧪 TestHomeScreen Error</h2>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🧪 TestHomeScreen - Success!</h2>
      <p>✅ User logged in: {user?.email}</p>
      <p>✅ Organizations loaded: {organizations.length}</p>
      {organizations.length > 0 ? (
        <div>
          <h3>Organizations:</h3>
          <ul>
            {organizations.map(org => (
              <li key={org.id}>{org.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No organizations found. This is normal for a new user.</p>
      )}
      <p>✅ The white page issue should be resolved!</p>
    </div>
  );
};

export default TestHomeScreen; 