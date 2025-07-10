import React, { useState, useEffect } from 'react';
import { Clock, Users, Target, TrendingUp, Plus, Bell, AlertCircle, Info, CheckCircle, Copy, Users as UsersIcon } from 'lucide-react';
import ApiService from '../services/api';
import { useSocket } from '../hooks/useSocket';
import './HomeScreen.css';

const HomeScreen = ({ user }) => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(false); // Add this missing state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHourLog, setShowHourLog] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hourLogData, setHourLogData] = useState({
    member: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeProjects: 0,
    hoursLogged: 0,
    completedTasks: 0
  });

  const socket = useSocket(
    localStorage.getItem('authToken'),
    localStorage.getItem('currentOrganization')
  );

  useEffect(() => {
    if (user) {
      loadOrganizationData();
    }
  }, [user]);

  // Removed auto-refresh to prevent excessive API calls

  useEffect(() => {
    if (socket) {
      socket.on('hours_logged', (hourData) => {
        // Update stats when anyone logs hours
        setStats(prev => ({
          ...prev,
          hoursLogged: prev.hoursLogged + parseFloat(hourData.hours)
        }));
        
        // Show notification for team hours
        if (hourData.userId !== user.id && Notification.permission === 'granted') {
          new Notification('Team Hours Logged', {
            body: `${hourData.memberName} logged ${hourData.hours} hours`,
            icon: '/favicon.ico'
          });
        }
      });

      return () => {
        socket.off('hours_logged');
      };
    }
  }, [socket]);

  const loadOrganizationData = async () => {
    try {
      console.log('🏠 HomeScreen: Loading organization data...');
      console.log('👤 User data:', user?.email, 'Organizations in user:', user?.organizations?.length || 0);
      
      // First check if user has organizations in their data
      let organizations = [];
      if (user?.organizations && user.organizations.length > 0) {
        console.log('✅ HomeScreen: Using organizations from user data');
        organizations = user.organizations;
      } else {
        console.log('🌐 HomeScreen: Fetching organizations from API...');
        const response = await ApiService.getMyOrganizations();
        console.log('📡 HomeScreen: API Organizations response:', response);
        organizations = response?.organizations || [];
      }
      
      if (organizations.length > 0) {
        const currentOrgId = localStorage.getItem('currentOrganization');
        
        // Handle different organization data structures
        let currentOrg = null;
        
        // Try to find by currentOrgId first
        if (currentOrgId) {
          currentOrg = organizations.find(org => {
            const orgId = org._id || org.organization?._id || org.organizationId?._id || org.organizationId;
            return orgId === currentOrgId;
          });
          
          if (currentOrg) {
            console.log('✅ HomeScreen: Found current organization by ID:', currentOrgId);
          } else {
            console.log('⚠️ HomeScreen: Current org ID not found in user organizations:', currentOrgId);
            // Clear invalid org ID
            localStorage.removeItem('currentOrganization');
          }
        }
        
        // If not found, use the first valid organization
        if (!currentOrg && organizations.length > 0) {
          currentOrg = organizations[0];
          const orgId = currentOrg._id || currentOrg.organization?._id || currentOrg.organizationId?._id || currentOrg.organizationId;
          if (orgId) {
            localStorage.setItem('currentOrganization', orgId);
            console.log('✅ HomeScreen: Set current organization to first available:', orgId);
          }
        }
        
        if (currentOrg) {
          // Set valid organization data
          setOrganization(currentOrg);
          setIsAdmin(['admin', 'owner'].includes(currentOrg?.role));
          console.log('✅ HomeScreen: Current organization set:', currentOrg.name, 'ID:', currentOrg._id);
          
          // Load organization-specific data
          const [projectsResponse, statsResponse, hoursResponse] = await Promise.all([
            ApiService.getProjects().catch((err) => {
              console.error('Failed to load projects:', err);
              return { projects: [] };
            }),
            ApiService.getStats().catch((err) => {
              console.error('Failed to load stats:', err);
              return { stats: { totalHours: 0, totalMembers: 1, activeProjects: 0, completedTasks: 0 } };
            }),
            ApiService.getHours().catch((err) => {
              console.error('Failed to load hours:', err);
              return { hourLogs: [], totalHours: 0 };
            })
          ]);
          
          console.log('HomeScreen: Loaded organization-specific data:', {
            org: currentOrg.name,
            projects: projectsResponse.projects?.length || 0,
            totalHours: hoursResponse.totalHours || 0,
            stats: statsResponse.stats
          });
          
          // Get accurate member count from organization
          const memberCount = currentOrg.memberCount || currentOrg.members?.length || 1;
          const projects = projectsResponse.projects || projectsResponse.data || [];
          const actualHours = hoursResponse.totalHours || 0;
          
          setProjects(projects);
          setStats({
            totalHours: actualHours,
            totalMembers: memberCount,
            activeProjects: projects.filter(p => p.status === 'active').length,
            hoursLogged: actualHours,
            completedTasks: statsResponse.stats?.completedTasks || projects.filter(p => p.status === 'completed').length || 0
          });
          
          setLoading(false);
        } else {
          console.log('❌ HomeScreen: No valid organization found - this should not happen for existing users');
          console.log('🔄 HomeScreen: Showing error state instead of redirecting');
          setLoading(false);
          return;
        }
      } else {
        console.log('⚠️ HomeScreen: No organizations found for user');
        console.log('📊 HomeScreen: User data organizations:', user?.organizations?.length || 0);
        console.log('📊 HomeScreen: API response organizations:', organizations?.length || 0);
        
        // Don't redirect - just show error state
        console.log('🔄 HomeScreen: Showing error state instead of redirecting');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load organization data:', error);
      
      // Don't redirect - just show error state
      console.log('🔄 HomeScreen: Showing error state instead of redirecting');
      setLoading(false);
      return;
    }
  };

  const handleLogHours = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!hourLogData.hours || !hourLogData.description || !hourLogData.member) {
      alert('Please fill in all required fields.');
      return;
    }
    
    if (parseFloat(hourLogData.hours) <= 0) {
      alert('Hours must be greater than 0.');
      return;
    }
    
    try {
      console.log('Logging hours with data:', hourLogData);
      
      const hourEntry = {
        hours: parseFloat(hourLogData.hours),
        description: hourLogData.description.trim(),
        date: hourLogData.date,
        organizationId: localStorage.getItem('currentOrganization') || 'default'
      };
      
      console.log('Sending hours data:', hourEntry);
      const result = await ApiService.logHours(hourEntry);
      console.log('Hours logging result:', result);
      
      if (result.success) {
        alert(`Successfully logged ${hourLogData.hours} hours!`);
        setShowHourLog(false);
        setHourLogData({
          member: '',
          hours: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Refresh data to get updated stats from database
        await loadOrganizationData();
        
        // Also update stats locally as immediate feedback
        setStats(prev => ({
          ...prev,
          hoursLogged: prev.hoursLogged + parseFloat(hourLogData.hours)
        }));
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to log hours:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to log hours: ${errorMessage}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="home-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="home-screen">
        <div className="error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px'
          }}>⚠️</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '15px',
            color: '#1F2937'
          }}>Unable to load organization data</h2>
          <p style={{
            fontSize: '1rem',
            color: '#6B7280',
            marginBottom: '25px',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>
            We're having trouble loading your organization information. This might be a temporary issue.
          </p>
          <div style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button 
              onClick={loadOrganizationData}
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'white',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{
      background: 'white',
      minHeight: '100vh',
      paddingTop: '90px',
      width: '100%'
    }}>
      {/* Dashboard Header */}
      <div className="dashboard-header" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px 20px 20px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem', 
              fontWeight: '700', 
              lineHeight: '1.1',
              marginBottom: '10px',
              color: '#1F2937',
              fontFamily: 'Poppins, sans-serif'
            }}>
              {organization?.name || 'Dashboard'}
            </h1>
            <p style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.5',
              color: '#6B7280',
              margin: 0
            }}>  
              Welcome back! Here's what's happening with your organization.
            </p>
          </div>
          
          {isAdmin && (
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
              borderRadius: '12px',
              padding: '15px 20px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              <UsersIcon size={16} />
              Admin Dashboard
            </div>
          )}
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Stats Cards */}
        <div className="stats-grid">
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          borderRadius: '15px',
          padding: '25px',
          color: 'white',
          textAlign: 'center'
        }}>
          <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'white' }} />
          <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>
            {stats.totalMembers}
          </h3>
          <p style={{ color: 'white' }}>Total Members</p>
        </div>
        
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          borderRadius: '15px',
          padding: '25px',
          color: 'white',
          textAlign: 'center'
        }}>
          <Target className="w-8 h-8 mx-auto mb-3" style={{ color: 'white' }} />
          <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>
            {stats.activeProjects}
          </h3>
          <p style={{ color: 'white' }}>Active Projects</p>
        </div>
        
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
          borderRadius: '15px',
          padding: '25px',
          color: 'white',
          textAlign: 'center'
        }}>
          <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: 'white' }} />
          <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>
            {stats.hoursLogged}
          </h3>
          <p style={{ color: 'white' }}>Hours Logged</p>
        </div>
        
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          borderRadius: '15px',
          padding: '25px',
          color: 'white',
          textAlign: 'center'
        }}>
          <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'white' }} />
          <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: 'white' }}>
            {stats.completedTasks}
          </h3>
          <p style={{ color: 'white' }}>Completed Tasks</p>
        </div>
        </div>

        {/* Quick Actions */}
        <div className="section quick-actions" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#1F2937' }}>
          Quick Actions
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button
            onClick={() => setShowHourLog(true)}
            style={{
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1rem',
              fontWeight: '500',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(55, 65, 81, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Plus className="w-5 h-5" />
            Log Volunteer Hours
          </button>
        </div>
        </div>
      </div>

      {/* Hour Logging Modal */}
      {showHourLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>
              Log Volunteer Hours
            </h3>
            
            <form onSubmit={handleLogHours}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Member
                </label>
                <select
                  value={hourLogData.member}
                  onChange={(e) => setHourLogData({...hourLogData, member: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px'
                  }}
                  required
                >
                  <option value="">Select member</option>
                  <option value={user.name}>{user.name} (You)</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Hours
                </label>
                <input
                  type="number"
                  value={hourLogData.hours}
                  onChange={(e) => setHourLogData({...hourLogData, hours: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px'
                  }}
                  min="0.5"
                  step="0.5"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  value={hourLogData.description}
                  onChange={(e) => setHourLogData({...hourLogData, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    minHeight: '80px'
                  }}
                  placeholder="What did you work on?"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={hourLogData.date}
                  onChange={(e) => setHourLogData({...hourLogData, date: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px'
                  }}
                  required
                />
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6B7280', 
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  💡 Tip: The date you select will be used to calculate performance trends on the Stats page
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowHourLog(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#8B5CF6',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Log Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Join Code Section - Compact */}
      {isAdmin && organization && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 30px',
          padding: '0 20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #BAE6FD'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#1F2937', 
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <UsersIcon className="w-5 h-5" />
                Organization Join Code
                <span style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '0.6rem',
                  padding: '3px 6px',
                  borderRadius: '8px',
                  fontWeight: '600'
                }}>
                  ADMIN
                </span>
              </h3>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '1rem',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>
                {organization.joinCode || 'NO CODE'}
              </div>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(organization.joinCode || '');
                    alert('Join code copied to clipboard!');
                  } catch (error) {
                    const textArea = document.createElement('textarea');
                    textArea.value = organization.joinCode || '';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Join code copied to clipboard!');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(55, 65, 81, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
            
            <p style={{
              marginTop: '10px',
              fontSize: '0.8rem',
              color: '#6B7280',
              fontStyle: 'italic'
            }}>
              💡 Share this code with new members to invite them to your organization
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;