import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, BarChart3, MessageSquare, User, LogOut, Menu, X, ChevronDown, FolderOpen, Building2, Bell, Settings } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationCenter from './NotificationCenter';
import ApiService from '../services/api';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
  ];

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  // Ensure dropdowns close properly
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close mobile menu when clicking outside
      if (isOpen && !event.target.closest('.navbar-container')) {
        setIsOpen(false);
      }
      if (!event.target.closest('.org-switcher')) {
        setShowOrgDropdown(false);
      }
      if (!event.target.closest('.user-menu')) {
        setShowUserDropdown(false);
      }
      if (!event.target.closest('.notification-center')) {
        setShowNotifications(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const loadOrganizations = async () => {
    try {
      const response = await ApiService.getMyOrganizations();
      console.log('Navbar organizations response:', response);
      
      const orgs = response?.organizations || [];
      setOrganizations(orgs);
      
      // Get current org from localStorage
      const currentOrgId = localStorage.getItem('currentOrganization');
      console.log('Current org ID from storage:', currentOrgId);
      
      // Find current organization
      let current = null;
      if (orgs && orgs.length > 0) {
        if (currentOrgId) {
          current = orgs.find(org => org._id === currentOrgId);
          console.log('Found current org:', current?.name);
        }
        
        // If no current org found or no currentOrgId, use first organization
        if (!current) {
          current = orgs[0];
          console.log('Using first org as current:', current?.name);
          localStorage.setItem('currentOrganization', current._id);
        }
        
        setCurrentOrg(current);
      } else {
        console.log('No organizations found');
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  // Improved organization switching logic
  const handleOrgSwitch = async (orgId) => {
    try {
      console.log('Switching to organization:', orgId);
      
      // Update localStorage
      localStorage.setItem('currentOrganization', orgId);
      
      // Find and set the new current organization
      const newOrg = organizations.find(org => org._id === orgId);
      
      if (newOrg) {
        setCurrentOrg(newOrg);
        console.log('Switched to org:', newOrg.name);
      } else {
        console.warn('Organization not found in local state');
      }
      
      setShowOrgDropdown(false);
      
      // Force page reload to refresh all data for the new organization
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
      alert('Failed to switch organization. Please try again.');
    }
  };
  
  const handleLeaveOrganization = async (orgId) => {
    if (window.confirm('Are you sure you want to leave this organization? This action cannot be undone.')) {
      try {
        await ApiService.leaveOrganization(orgId);
        
        // Remove from localStorage if it's the current org
        if (localStorage.getItem('currentOrganization') === orgId) {
          localStorage.removeItem('currentOrganization');
        }
        
        // Reload organizations
        await loadOrganizations();
        setShowUserDropdown(false);
        
        // Show success message
        alert('Successfully left the organization!');
        
        // Check if user has any organizations left
        const updatedOrgs = await ApiService.getMyOrganizations();
        
        if (!updatedOrgs || updatedOrgs.length === 0) {
          window.location.href = '/organization/create';
        } else {
          const firstOrg = updatedOrgs[0];
          localStorage.setItem('currentOrganization', firstOrg.organizationId._id);
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to leave organization:', error);
        alert('Failed to leave organization. Please try again.');
      }
    }
  };

  // Generate unique color based on user ID
  const getAvatarColor = (userId) => {
    const colors = [
      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red
      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Blue
      'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Green
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Yellow
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Purple
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
      'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)', // Lime
      'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Orange
      'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
    ];
    
    // Use user ID to consistently assign colors
    const index = userId?.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index] || colors[0];
  };

  // Truncate name to fit in navbar
  const truncateName = (name, maxLength = 15) => {
    const safeName = name || 'User';
    if (safeName.length <= maxLength) return safeName;
    return safeName.substring(0, maxLength - 3) + '...';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left side - Logo and Navigation */}
        <div className="navbar-left">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <span className="logo-emoji">⭐</span>
            <span className="logo-text">Foundly</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="navbar-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`navbar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} className="navbar-icon" />
                  <span className="navbar-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Center - Organization Switcher */}
        {user && (
          <div className="org-switcher">
            <button 
              className="org-button"
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            >
              <Building2 size={16} />
              <span className="org-name">
                {currentOrg?.name || (organizations && organizations.length > 0 ? organizations[0]?.organizationId?.name || organizations[0]?.name || 'Organization' : 'Organization')}
              </span>
              <ChevronDown size={16} className={`chevron ${showOrgDropdown ? 'open' : ''}`} />
            </button>
            
            {showOrgDropdown && (
              <div className="org-dropdown">
                <div className="org-dropdown-header">
                  <span>Switch Organization</span>
                </div>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => {
                    const orgId = org.organizationId?._id || org.organizationId || org._id;
                    const orgName = org.organizationId?.name || org.name || 'Unknown Organization';
                    const orgRole = org.role || 'Member';
                    const isActive = currentOrg?._id === orgId;
                    
                    return (
                      <button
                        key={orgId}
                        className={`org-option ${isActive ? 'active' : ''}`}
                        onClick={() => handleOrgSwitch(orgId)}
                      >
                        <div className="org-info">
                          <span className="org-option-name">{orgName}</span>
                          <span className="org-role">{orgRole}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="org-option" style={{ color: '#6c757d', fontStyle: 'italic' }}>
                    Loading organizations...
                  </div>
                )}
                <div className="org-dropdown-divider" />
                <Link to="/organization/create" className="org-option create-new">
                  <span>+ New Organization</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Right side - Notifications, User Menu */}
        {user && (
          <div className="navbar-right">
            {/* User Menu - Direct link to profile */}
            <div className="user-menu">
              <Link 
                to="/profile"
                className="user-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  color: 'white',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span className="user-avatar" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: getAvatarColor(user.id),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  {(truncateName(user.name) || 'U')[0]?.toUpperCase() || '👤'}
                </span>
                <span className="user-name" style={{
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {truncateName(user.name)}
                  {organizations && organizations.length > 0 && (
                    (() => {
                      const currentOrg = organizations.find(org => {
                        const orgId = org.organizationId?._id || org.organizationId || org._id;
                        return orgId === localStorage.getItem('currentOrganization');
                      });
                      if (currentOrg && ['admin', 'owner'].includes(currentOrg.role)) {
                        return (
                          <span style={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: 'white',
                            fontSize: '0.6rem',
                            padding: '2px 4px',
                            borderRadius: '6px',
                            marginLeft: '6px',
                            fontWeight: '600',
                            verticalAlign: 'middle'
                          }}>
                            ADMIN
                          </span>
                        );
                      }
                      return null;
                    })()
                  )}
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} className="navbar-icon" />
                <span className="navbar-label">{item.label}</span>
              </Link>
            );
          })}
          
          {user && (
            <>
              <div className="mobile-menu-divider" />
              <Link to="/profile" className="mobile-menu-item">
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: getAvatarColor(user.id),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {truncateName(user.name)?.[0]?.toUpperCase() || '👤'}
                </div>
                <span>Overview</span>
              </Link>
              <button className="mobile-menu-item logout" onClick={onLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;