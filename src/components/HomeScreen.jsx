import React, { useState, useEffect } from 'react';
import { Clock, Users, Target, TrendingUp, Plus, Bell, AlertCircle, Info, CheckCircle, Copy, Users as UsersIcon, RefreshCw } from 'lucide-react';
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
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeProjects: 0,
    hoursLogged: 0,
    completedTasks: 0
  });
  const [orgLoadError, setOrgLoadError] = useState(null);

  const socket = useSocket(
    localStorage.getItem('authToken'),
    localStorage.getItem('currentOrganization')
  );

  useEffect(() => {
    if (user && user.email) {
      console.log('👤 HomeScreen: User data available, loading organization data...');
      loadOrganizationData();
      // Also load stats immediately to avoid showing 0
      refreshStats();
    } else {
      console.log('⏳ HomeScreen: Waiting for complete user data...');
    }
  }, [user]);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChange = (event) => {
      console.log('🔄 HomeScreen: Organization changed, refreshing data...', event.detail);
      loadOrganizationData();
      refreshStats();
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, [user]);

  // Remove the conflicting useEffect that calls refreshStats independently
  // useEffect(() => {
  //   // Fetch stats on mount
  //   refreshStats();
  //   // Set up interval for auto-refresh
  //   const interval = setInterval(() => {
  //     refreshStats();
  //   }, 30000); // 30 seconds
  //   return () => clearInterval(interval);
  // }, []);

  // Set up auto-refresh interval only after organization is loaded
  useEffect(() => {
    if (organization) {
      const interval = setInterval(() => {
        refreshStats();
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [organization]);

  useEffect(() => {
    if (socket) {
      socket.on('hours_logged', (hourData) => {
        // Refresh stats from database when anyone logs hours
        refreshStats();
        
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
    setOrgLoadError(null);
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
          // Normalize organization structure
          const normalizedOrg = {
            _id: currentOrg._id || currentOrg.organization?._id || currentOrg.organizationId?._id || currentOrg.organizationId,
            name: currentOrg.name || currentOrg.organization?.name || currentOrg.organizationId?.name || 'Unknown Organization',
            description: currentOrg.description || currentOrg.organization?.description || '',
            joinCode: currentOrg.joinCode || currentOrg.organization?.joinCode || currentOrg.organizationId?.joinCode || '',
            role: currentOrg.role || 'member'
          };
          
          // Set valid organization data
          setOrganization(normalizedOrg);
          setIsAdmin(['admin', 'owner'].includes(normalizedOrg?.role));
          console.log('✅ HomeScreen: Current organization set:', normalizedOrg.name, 'ID:', normalizedOrg._id);
          
          // Ensure organization ID is set in localStorage
          if (normalizedOrg._id) {
            localStorage.setItem('currentOrganization', normalizedOrg._id);
            console.log('✅ HomeScreen: Organization ID set in localStorage:', normalizedOrg._id);
          }
          
          // Load organization-specific data
          console.log('🔄 HomeScreen: Loading data for organization:', normalizedOrg._id);
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
            org: normalizedOrg.name,
            projects: projectsResponse.projects?.length || 0,
            totalHours: hoursResponse.totalHours || 0,
            stats: statsResponse.stats
          });
          
          // Use accurate stats from API response instead of calculating locally
          const projects = projectsResponse.projects || projectsResponse.data || [];
          const stats = statsResponse.stats || statsResponse.data || {};
          
          console.log('📊 Parsed stats from API:', stats);
          
          setProjects(projects);
          setStats({
            totalHours: stats.totalHours || 0,
            totalMembers: stats.totalMembers || 1,
            activeProjects: stats.activeProjects || 0,
            hoursLogged: stats.totalHours || 0,
            completedTasks: stats.completedTasks || 0
          });
          
          console.log('✅ Stats set from API:', {
            totalHours: stats.totalHours || 0,
            totalMembers: stats.totalMembers || 1,
            activeProjects: stats.activeProjects || 0,
            hoursLogged: stats.totalHours || 0,
            completedTasks: stats.completedTasks || 0
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
        await refreshStats(); // Ensure stats are always up to date from database
        
        // Don't update stats locally - let the database be the source of truth
        // This ensures consistency between HomeScreen and StatsScreen
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to log hours:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to log hours: ${errorMessage}. Please try again.`);
    }
  };

  // Add a refresh function for live stats
  const refreshStats = async () => {
    setLoading(true);
    try {
      console.log('🔄 Refreshing stats...');
      
      // Check if we have a valid organization ID
      const currentOrgId = localStorage.getItem('currentOrganization');
      console.log('🏢 Current organization ID from localStorage:', currentOrgId);
      
      if (!currentOrgId) {
        console.warn('⚠️ No organization ID found in localStorage, using default');
        localStorage.setItem('currentOrganization', 'default');
      }
      
      // Use the working endpoint for consistent stats
      const statsResponse = await ApiService.getStats();
      console.log('📊 Stats response:', statsResponse);
      
      const stats = statsResponse.stats || statsResponse.data || {};
      console.log('📈 Parsed stats:', stats);
      
      setStats({
        totalMembers: stats.totalMembers || 0,
        activeProjects: stats.activeProjects || 0,
        hoursLogged: stats.totalHours || 0,
        completedTasks: stats.completedTasks || 0
      });
      
      console.log('✅ Stats updated:', {
        totalMembers: stats.totalMembers || 0,
        activeProjects: stats.activeProjects || 0,
        hoursLogged: stats.totalHours || 0,
        completedTasks: stats.completedTasks || 0
      });
    } catch (error) {
      console.error('❌ Failed to refresh stats:', error);
      console.error('❌ Error details:', error.message);
      // Optionally show an error toast
    }
    setLoading(false);
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
  if (orgLoadError) {
    return (
      <div className="home-screen">
        <div className="loading-container">
          <p style={{ color: '#d9534f', fontStyle: 'italic' }}>{orgLoadError}</p>
          <button style={{ marginTop: 8 }} onClick={loadOrganizationData}>Retry</button>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="home-screen">
        <div className="welcome-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px 20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '15px',
            color: 'white'
          }}>Welcome to Foundly!</h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '30px',
            maxWidth: '500px',
            lineHeight: '1.6'
          }}>
            You're all set up! To get started, you'll need to create or join an organization.
          </p>
          <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
                          <button 
                onClick={() => window.location.href = '/organization/create'}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '12px',
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Create Organization
              </button>
            <button 
              onClick={() => window.location.href = '/organization/join'}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 30px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
                          >
                Join Organization
              </button>
          </div>
          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            maxWidth: '400px'
          }}>
            <h3 style={{ marginBottom: '10px', color: 'white' }}>What's Next?</h3>
            <ul style={{ 
              textAlign: 'left', 
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6'
            }}>
              <li>Create your first organization</li>
              <li>Invite team members</li>
              <li>Start tracking projects</li>
              <li>Log volunteer hours</li>
            </ul>
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
      width: '100%',
      boxSizing: 'border-box',
      paddingLeft: '0',
      paddingRight: '0',
    }}>
      {/* Dashboard Header */}
      <div className="dashboard-header" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px 32px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '32px',
      }}>
        <div style={{
          flex: 1,
          minWidth: '320px',
          marginRight: '32px',
          marginBottom: '16px',
        }}>
          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: '700',
            margin: 0,
            color: '#111827',
            letterSpacing: '-0.02em',
            fontFamily: 'Poppins, sans-serif',
            marginBottom: '12px',
          }}>{organization?.name || 'Organization Dashboard'}</h1>
          <p style={{
            fontSize: '1.15rem',
            color: '#6B7280',
            marginTop: '0',
            maxWidth: '500px',
            lineHeight: '1.5',
            fontFamily: 'Poppins, sans-serif',
            marginBottom: 0,
          }}>
            Streamline your organization&apos;s workflow with our comprehensive management platform. Track progress, manage teams, and achieve your goals.
          </p>
        </div>
        {/* Angled Card with Rocketship */}
        <div style={{
          background: 'linear-gradient(135deg, #3730A3 0%, #6366F1 100%)',
          color: 'white',
          borderRadius: '22px',
          padding: '32px 36px',
          minWidth: '320px',
          minHeight: '160px',
          boxShadow: '0 8px 32px rgba(55, 48, 163, 0.18)',
          transform: 'rotate(-6deg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '16px',
          position: 'relative',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀</div>
          <div style={{ fontWeight: 700, fontSize: '1.35rem', marginBottom: '8px', letterSpacing: '-0.01em', textAlign: 'center' }}>
            Welcome to Foundly
          </div>
          <div style={{ fontSize: '1.08rem', color: '#E0E7FF', textAlign: 'center', fontWeight: 400 }}>
            Your organization&apos;s central hub for collaboration and impact
          </div>
        </div>
      </div>
      {/* Stats Grid + Refresh */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px',
        }}>
          <button
            onClick={refreshStats}
            style={{
              background: 'none',
              color: '#6366F1',
              border: 'none',
              borderRadius: '50%',
              padding: '6px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Refresh Stats"
            disabled={loading}
            title="Refresh Stats"
          >
            <RefreshCw size={20} style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }} className={loading ? 'spin' : ''} />
          </button>
        </div>
        <div className="stats-grid">
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.10)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700 }}>{stats.totalMembers}</div>
            <div style={{ fontSize: '1.1rem', marginTop: '6px', color: '#D1FAE5' }}>Total Members</div>
          </div>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.10)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎯</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700 }}>{stats.activeProjects}</div>
            <div style={{ fontSize: '1.1rem', marginTop: '6px', color: '#E0E7FF' }}>Active Projects</div>
          </div>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(236, 72, 153, 0.10)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>⏰</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700 }}>{stats.hoursLogged}</div>
            <div style={{ fontSize: '1.1rem', marginTop: '6px', color: '#FCE7F3' }}>Hours Logged</div>
          </div>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, #F59E42 0%, #FBBF24 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.10)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>📈</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700 }}>{stats.completedTasks}</div>
            <div style={{ fontSize: '1.1rem', marginTop: '6px', color: '#FEF3C7' }}>Completed Projects</div>
          </div>
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

      {/* Organization Join Code Section - Show to all members */}
      {organization && (
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
                {isAdmin && (
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
                )}
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
                {organization?.joinCode || 'NO CODE'}
              </div>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(organization?.joinCode || '');
                    alert('Join code copied to clipboard!');
                  } catch (error) {
                    const textArea = document.createElement('textarea');
                    textArea.value = organization?.joinCode || '';
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
              {isAdmin ? 
                '💡 Share this code with new members to invite them to your organization' :
                '💡 Share this code with others to invite them to join your organization'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
