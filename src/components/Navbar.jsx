import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, BarChart3, MessageSquare, User, LogOut, Menu, X, ChevronDown, FolderOpen, Building2, Settings } from 'lucide-react';

import ApiService from '../services/api';
import SimpleOrgSwitcher from './SimpleOrgSwitcher';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
  ];

  // Ensure dropdowns close properly
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close mobile menu when clicking outside
      if (isOpen && !event.target.closest('.navbar-container')) {
        setIsOpen(false);
      }
      if (!event.target.closest('.user-menu')) {
        setShowUserDropdown(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);



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
          <SimpleOrgSwitcher 
            user={user} 
            onOrgChange={(newOrg) => {
              console.log('🔄 Organization changed in Navbar:', newOrg);
              // The SimpleOrgSwitcher handles the page refresh internally
            }}
          />
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