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
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general'
  });
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
    loadOrganizationData();
    loadAnnouncements();
  }, []);

  // Refresh data periodically to ensure syncing
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrganizationData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_announcement', (announcement) => {
        setAnnouncements(prev => [announcement, ...(prev || [])]);
        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('New Announcement', {
            body: announcement.title,
            icon: '/favicon.ico'
          });
        }
      });

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
        socket.off('new_announcement');
        socket.off('hours_logged');
      };
    }
  }, [socket]);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // Try to get organizations from API
      const response = await ApiService.getMyOrganizations();
      console.log('Organization response:', response);
      
      // Handle the new API response format
      const organizations = response?.organizations || response || [];
      
      if (organizations && organizations.length > 0) {
        let currentOrg = organizations.find(org => 
          org._id === localStorage.getItem('currentOrganization')
        );
        
        if (!currentOrg) {
          currentOrg = organizations[0];
          localStorage.setItem('currentOrganization', currentOrg._id);
        }
        
        // Set organization data
        setOrganization(currentOrg);
        setIsAdmin(['admin', 'owner'].includes(currentOrg.role));
        
        // Load real stats
        const [projectsResponse, statsResponse] = await Promise.all([
          ApiService.getProjects().catch(() => ({ projects: [] })),
          ApiService.getStats().catch(() => ({ totalHours: 0, totalMembers: 1 }))
        ]);
        
        // Get member count from organization or stats
        const memberCount = currentOrg.members?.length || statsResponse.totalMembers || 1;
        const projects = projectsResponse.projects || projectsResponse.data || [];
        
        setStats({
          totalMembers: memberCount,
          activeProjects: projects.filter(p => p.status === 'active').length || 0,
          hoursLogged: statsResponse.totalHours || 0,
          completedTasks: projects.filter(p => p.status === 'completed').length || 0
        });
        
        setLoading(false);
      } else {
        // Create a default organization for the user
        console.log('No organizations found, creating default organization');
        const defaultOrg = {
          _id: 'default-org',
          name: user.name + "'s Organization",
          description: 'Your personal organization',
          role: 'admin',
          members: [{ userId: user._id || user.id, role: 'admin' }]
        };
        
        setOrganization(defaultOrg);
        setIsAdmin(true);
        localStorage.setItem('currentOrganization', defaultOrg._id);
        
        // Set default stats
        setStats({
          totalMembers: 1,
          activeProjects: 0,
          hoursLogged: 0,
          completedTasks: 0
        });
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load organization data:', error);
      
      // Create a default organization on error
      console.log('Creating default organization due to API error');
      const defaultOrg = {
        _id: 'default-org',
        name: user.name + "'s Organization",
        description: 'Your personal organization',
        role: 'admin',
        members: [{ userId: user._id || user.id, role: 'admin' }]
      };
      
      setOrganization(defaultOrg);
      setIsAdmin(true);
      localStorage.setItem('currentOrganization', defaultOrg._id);
      
      // Set default stats
      setStats({
        totalMembers: 1,
        activeProjects: 0,
        hoursLogged: 0,
        completedTasks: 0
      });
      
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await ApiService.getAnnouncements();
      setAnnouncements(response.announcements || response || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      // Set empty array - no fake announcements
      setAnnouncements([]);
    }
  };

  const markAnnouncementAsRead = async (announcementId) => {
    try {
      await ApiService.markAnnouncementRead(announcementId);
      setAnnouncements(prev => 
        prev.map(ann => 
          ann._id === announcementId 
            ? { ...ann, readBy: [...(ann.readBy || []), user.id] }
            : ann
        )
      );
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
    }
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating announcement with data:', newAnnouncement);
      
      // Add organization context to the announcement
      const currentOrgId = localStorage.getItem('currentOrganization') || 'default';
      
      const announcementWithOrg = {
        ...newAnnouncement,
        organizationId: currentOrgId
      };
      
      console.log('Sending announcement data:', announcementWithOrg);
      const result = await ApiService.createAnnouncement(announcementWithOrg);
      console.log('Announcement creation result:', result);
      
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'general'
      });
      setShowCreateForm(false);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert('Failed to create announcement: ' + error.message);
    }
  };

  const handleLogHours = async (e) => {
    e.preventDefault();
    try {
      console.log('Logging hours with data:', hourLogData);
      
      const hourEntry = {
        hours: parseFloat(hourLogData.hours),
        description: hourLogData.description,
        date: hourLogData.date,
        category: 'volunteer',
        organizationId: localStorage.getItem('currentOrganization') || 'default'
      };
      
      console.log('Sending hours data:', hourEntry);
      const result = await ApiService.logHours(hourEntry);
      console.log('Hours logging result:', result);
      
      // Emit via socket for real-time updates
      if (socket) {
        socket.emit('log_hours', hourEntry);
      }
      
      alert(`Successfully logged ${hourLogData.hours} hours for ${hourLogData.member}`);
      setShowHourLog(false);
      setHourLogData({
        member: '',
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Update stats locally
      setStats(prev => ({
        ...prev,
        hoursLogged: prev.hoursLogged + parseFloat(hourLogData.hours)
      }));
    } catch (error) {
      console.error('Failed to log hours:', error);
      alert('Failed to log hours. Please try again.');
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
        <div className="error-container">
          <p>Unable to load organization data. Please try refreshing the page.</p>
          <button onClick={loadOrganizationData}>Retry</button>
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
      {/* Hero Section */}
      <div className="hero-section" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        alignItems: 'center',
        color: '#333'
      }}>
        <div className="hero-text">
          <h1 style={{
            fontSize: '3.5rem', 
            fontWeight: '800', 
            lineHeight: '1.1',
            marginBottom: '20px',
            color: '#000000', // Ensure black color
            fontFamily: 'Poppins, sans-serif',
            textShadow: 'none' // Remove any text shadow
          }}>
            {organization?.name || 'Welcome'}
          </h1>
          <p style={{ 
            fontSize: '1.3rem', 
            lineHeight: '1.6',
            marginBottom: '30px',
            maxWidth: '500px',
            color: '#000000' // Changed from #6b7280 to black
          }}>  
            Streamline your organization's workflow with our comprehensive management platform. Track progress, manage teams, and achieve your goals.
          </p>
          {/* Removed Get Started button */}
        </div>
        
        <div className="hero-visual" style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)', // Keep navbar colors
            borderRadius: '24px',
            padding: '30px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
            transform: 'rotate(-5deg)',
            width: '400px',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚀</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '10px', color: 'white' }}>Welcome to Foundly</h3>
            <p style={{ textAlign: 'center', opacity: 0.9, color: 'white' }}>Your organization's central hub for collaboration and impact</p>
          </div>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Stats Cards - Make text white */}
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

        {/* Announcements Section */}
        <div className="section announcements-section" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937', fontFamily: 'Poppins, sans-serif' }}>
            <Bell className="w-6 h-6 inline mr-2" />
            Recent Announcements
            {isAdmin && (
              <span style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                fontSize: '0.7rem',
                padding: '4px 8px',
                borderRadius: '12px',
                marginLeft: '10px',
                fontWeight: '600',
                verticalAlign: 'middle'
              }}>
                ADMIN
              </span>
            )}
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1rem',
                fontWeight: '600',
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
              Create Announcement
            </button>
          )}
        </div>
        
        {(announcements || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#F9FAFB', borderRadius: '10px', border: '2px dashed #E5E7EB' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📢</div>
            <h4 style={{ color: '#1F2937', marginBottom: '10px' }}>No announcements yet</h4>
            {isAdmin ? (
              <p style={{ color: '#6B7280', marginBottom: '20px' }}>Be the first to share something with your team!</p>
            ) : (
              <div style={{ color: '#6B7280', marginBottom: '20px' }}>
                <p style={{ marginBottom: '10px' }}>No announcements have been posted yet.</p>
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  color: '#92400E'
                }}>
                  <strong>💡 Note:</strong> Only organization admins can create announcements. 
                  Contact your admin if you have something important to share with the team.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="announcements-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {(announcements || []).slice(0, 5).map((announcement) => {
              const isRead = announcement.readBy?.some(readEntry => 
                readEntry.user === user.id || readEntry.user === user._id
              );
              return (
                <div
                  key={announcement._id}
                  className="announcement-item"
                  style={{
                    padding: '15px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    background: isRead ? '#F9FAFB' : '#FEF3C7',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => !isRead && markAnnouncementAsRead(announcement._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {getAnnouncementIcon(announcement.type)}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1F2937' }}>
                        {announcement.title}
                      </h4>
                      <p style={{ color: '#6B7280', marginBottom: '8px' }}>
                        {announcement.content}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        {!isRead && (
                          <span style={{
                            background: '#EF4444',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem'
                          }}>
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Announcement Creation Modal */}
        {showCreateForm && (
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
              maxWidth: '500px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937' }}>
                  Create Announcement
                  <span style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: '0.6rem',
                    padding: '3px 6px',
                    borderRadius: '8px',
                    marginLeft: '8px',
                    fontWeight: '600',
                    verticalAlign: 'middle'
                  }}>
                    ADMIN ONLY
                  </span>
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6B7280'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>👑</span>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#0284C7'
                }}>
                  <strong>Admin Feature:</strong> As an organization admin, you can create announcements that will be visible to all members.
                </p>
              </div>
              
              <form onSubmit={handleCreateAnnouncement}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                    required
                    maxLength={100}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151' }}>
                    Content
                  </label>
                  <textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      minHeight: '100px',
                      resize: 'vertical',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                    required
                    maxLength={2000}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151' }}>
                    Type
                  </label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                    <option value="update">Update</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: '500'
                    }}
                  >
                    Create Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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