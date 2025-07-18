import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import ApiService from '../services/api';
import './SimpleOrgSwitcher.css';

const SimpleOrgSwitcher = ({ user, onOrgChange }) => {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading organizations...');
      const response = await ApiService.getMyOrganizations();
      console.log('📡 Organizations response:', response);
      
      if (response && response.organizations) {
        const orgs = response.organizations.map(org => ({
          _id: org.id || org._id,
          name: org.name,
          description: org.description,
          joinCode: org.joinCode,
          isCurrent: org.isCurrent || false
        }));
        
        setOrganizations(orgs);
        
        // Set current organization
        const current = orgs.find(org => org.isCurrent) || orgs[0];
        if (current) {
          setCurrentOrg(current);
          localStorage.setItem('currentOrganization', current._id);
        }
        
        console.log('✅ Organizations loaded:', orgs.length);
      } else {
        setOrganizations([]);
        setCurrentOrg(null);
        console.log('⚠️ No organizations found');
      }
    } catch (error) {
      console.error('❌ Failed to load organizations:', error);
      setError('Failed to load organizations');
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSwitch = async (orgId) => {
    try {
      console.log('🔄 Switching to organization:', orgId);
      
      // Find the organization
      const newOrg = organizations.find(org => org._id === orgId);
      if (!newOrg) {
        console.error('❌ Organization not found:', orgId);
        return;
      }
      
      // Update localStorage
      localStorage.setItem('currentOrganization', orgId);
      
      // Update state
      setCurrentOrg(newOrg);
      setShowDropdown(false);
      
      // Call backend to switch organization
      await ApiService.switchOrganization(orgId);
      console.log('✅ Organization switched successfully');
      
      // Notify parent component
      if (onOrgChange) {
        onOrgChange(newOrg);
      }
      
      // Refresh the page to update all data
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Failed to switch organization:', error);
      alert('Failed to switch organization. Please try again.');
    }
  };

  const handleCreateNew = () => {
    window.location.href = '/organization/create';
  };

  if (loading) {
    return (
      <div className="simple-org-switcher">
        <button className="org-button loading">
          <RefreshCw size={16} className="spinning" />
          <span>Loading...</span>
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-org-switcher">
        <button className="org-button error" onClick={loadOrganizations}>
          <span>Error loading orgs</span>
          <RefreshCw size={16} />
        </button>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="simple-org-switcher">
        <button className="org-button create" onClick={handleCreateNew}>
          <Plus size={16} />
          <span>Create Organization</span>
        </button>
      </div>
    );
  }

  return (
    <div className="simple-org-switcher">
      <button 
        className="org-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Building2 size={16} />
        <span className="org-name">
          {currentOrg?.name || 'Organization'}
        </span>
        <ChevronDown size={16} className={`chevron ${showDropdown ? 'open' : ''}`} />
      </button>
      
      {showDropdown && (
        <div className="org-dropdown">
          <div className="org-dropdown-header">
            <span>Switch Organization</span>
          </div>
          
          {organizations.map((org) => (
            <button
              key={org._id}
              className={`org-option ${currentOrg?._id === org._id ? 'active' : ''}`}
              onClick={() => handleOrgSwitch(org._id)}
            >
              <div className="org-info">
                <span className="org-option-name">{org.name}</span>
                <span className="org-role">
                  {org.isCurrent ? 'Current' : 'Member'}
                </span>
              </div>
            </button>
          ))}
          
          <div className="org-dropdown-divider" />
          
          <button className="org-option create-new" onClick={handleCreateNew}>
            <Plus size={16} />
            <span>Create New Organization</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleOrgSwitcher; 