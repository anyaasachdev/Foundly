import React, { useState, useEffect } from 'react';
import { User, Edit, Edit3, Save, X, Plus, Star, Award, Activity, Settings, Bell, Lock, Palette, Globe, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, Heart, Zap, Target, TrendingUp, Camera, Link as LinkIcon, Github, Linkedin, Twitter, Instagram, ExternalLink, Shield, Eye, EyeOff } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import ApiService from '../services/api';
import './ProfileScreen.css';

const ProfileScreen = ({ user }) => {
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || '',
    department: user?.department || '',
    title: user?.title || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
    avatar: user?.avatar || '',
    skills: user?.skills || [],
    achievements: user?.achievements || [],
    socialLinks: user?.socialLinks || {
      github: '',
      linkedin: '',
      twitter: '',
      instagram: ''
    },
    preferences: {
      notifications: {
        email: true,
        push: true,
        announcements: true
      },
      emailVisible: false,
      phoneVisible: false
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [currentOrg, setCurrentOrg] = useState(null);
  const { showToast } = useNotifications();

  const tabs = [
    // Removed overview tab since it's redundant
  ];

  useEffect(() => {
    loadProfileData();
    loadCurrentOrganization();
  }, [user]);

  const loadProfileData = async () => {
    try {
      setProfile({
        name: user?.name || 'User Name',
        email: user?.email || 'user@example.com',
        phone: user?.phone || '',
        role: user?.role || 'Member',
        title: user?.title || '',
        department: user?.department || '',
        organization: user?.organization?.name || 'Your Organization',
        joinDate: user?.createdAt || new Date().toISOString(),
        bio: user?.bio || '',
        location: user?.location || '',
        website: user?.website || '',
        github: user?.github || '',
        linkedin: user?.linkedin || '',
        avatar: user?.avatar || '',
        skills: user?.skills || [],
        achievements: user?.achievements || [],
        socialLinks: user?.socialLinks || {
          github: '',
          linkedin: '',
          twitter: '',
          instagram: ''
        },
        preferences: {
          notifications: {
            email: user?.preferences?.notifications?.email ?? true,
            push: user?.preferences?.notifications?.push ?? true,
            announcements: user?.preferences?.notifications?.announcements ?? true
          },
          emailVisible: user?.preferences?.emailVisible ?? false,
          phoneVisible: user?.preferences?.phoneVisible ?? false
        }
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('Failed to load profile data', 'error');
    }
  };

  const loadCurrentOrganization = async () => {
    try {
      const response = await ApiService.getMyOrganizations();
      const currentOrgId = localStorage.getItem('currentOrganization');
      const currentOrg = response.find(org => {
        const orgId = org.organizationId?._id || org.organizationId || org._id;
        return orgId === currentOrgId;
      });
      
      if (currentOrg) {
        setCurrentOrg(currentOrg.organizationId || currentOrg);
      }
    } catch (error) {
      console.error('Failed to load current organization:', error);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!currentOrg) {
      showToast('No organization to leave', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to leave this organization? This action cannot be undone.')) {
      try {
        await ApiService.leaveOrganization(currentOrg._id);
        
        // Remove from localStorage if it's the current org
        if (localStorage.getItem('currentOrganization') === currentOrg._id) {
          localStorage.removeItem('currentOrganization');
        }
        
        showToast('Successfully left the organization!', 'success');
        
        // Redirect to organization creation or home
        window.location.href = '/organization/create';
      } catch (error) {
        console.error('Failed to leave organization:', error);
        showToast('Failed to leave organization. Please try again.', 'error');
      }
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await ApiService.logout();
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout error:', error);
        // Force logout anyway
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentOrganization');
        window.location.href = '/login';
      }
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await ApiService.updateUserProfile(profile);
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
      // Refresh profile data to show updated info
      await loadProfileData();
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProfileCompletion = () => {
    const fields = ['name', 'email', 'title', 'department', 'bio'];
    const completed = fields.filter(field => profile[field]?.trim()).length;
    const skillsBonus = profile.skills.length > 0 ? 1 : 0;
    const socialBonus = (profile.github || profile.linkedin || profile.website) ? 1 : 0;
    return Math.round(((completed + skillsBonus + socialBonus) / (fields.length + 2)) * 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderOverviewTab = () => (
    <div className="profile-overview">
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Profile" />
            ) : (
              <span className="avatar-placeholder">{profile.name?.[0]?.toUpperCase() || '👤'}</span>
            )}
          </div>
          <div className="profile-completion">
            <div className="completion-circle">
              <svg viewBox="0 0 36 36" className="completion-svg">
                <path
                  className="completion-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="completion-progress"
                  strokeDasharray={`${getProfileCompletion()}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="completion-text">{getProfileCompletion()}%</span>
            </div>
            <span className="completion-label">Profile Complete</span>
          </div>
        </div>
        
        <div className="profile-info">
          <div className="profile-name-section">
            {isEditing ? (
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className="profile-name-input"
                placeholder="Your name"
              />
            ) : (
              <h1 className="profile-name">{profile.name}</h1>
            )}
            
            {isEditing ? (
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                className="profile-title-input"
                placeholder="Your title"
              />
            ) : (
              <p className="profile-title">{profile.title}</p>
            )}
          </div>
          
          <div className="profile-details">
            <div className="detail-item">
              <Mail size={16} />
              {isEditing ? (
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  className="detail-input"
                />
              ) : (
                <span>{profile.email}</span>
              )}
            </div>
            
            <div className="detail-item">
              <MapPin size={16} />
              {isEditing ? (
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  className="detail-input"
                  placeholder="Your location"
                />
              ) : (
                <span>{profile.location || 'Location not set'}</span>
              )}
            </div>
            
            <div className="detail-item">
              <Phone size={16} />
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="detail-input"
                  placeholder="Your phone number"
                />
              ) : (
                <span>{profile.phone || 'Phone not set'}</span>
              )}
            </div>
          </div>
          
          <div className="profile-actions">
            {isEditing ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    loadProfileData(); // Reset to original data
                  }}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="profile-section">
        <h3>About</h3>
        {isEditing ? (
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            className="bio-textarea"
            placeholder="Tell us about yourself..."
            rows={4}
          />
        ) : (
          <p className="profile-bio">{profile.bio || 'No bio added yet.'}</p>
        )}
      </div>
      
      <div className="profile-section">
        <h3>Links</h3>
        <div className="social-links">
          <div className="social-link">
            <Globe size={16} />
            {isEditing ? (
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                className="social-input"
                placeholder="Your website"
              />
            ) : (
              <span>{profile.website || 'No website'}</span>
            )}
          </div>
          
          <div className="social-link">
            <Github size={16} />
            {isEditing ? (
              <input
                type="text"
                value={profile.github}
                onChange={(e) => setProfile(prev => ({ ...prev, github: e.target.value }))}
                className="social-input"
                placeholder="GitHub username"
              />
            ) : (
              <span>{profile.github || 'No GitHub'}</span>
            )}
          </div>
          
          <div className="social-link">
            <Linkedin size={16} />
            {isEditing ? (
              <input
                type="text"
                value={profile.linkedin}
                onChange={(e) => setProfile(prev => ({ ...prev, linkedin: e.target.value }))}
                className="social-input"
                placeholder="LinkedIn username"
              />
            ) : (
              <span>{profile.linkedin || 'No LinkedIn'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    return renderOverviewTab();
  };

  // Main component render
  return (
    <div className="profile-screen">
      <div className="profile-container">
        {/* Top Actions Bar */}
        <div className="profile-top-actions" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e5e7eb'
        }}>
          <button
            onClick={handleLeaveOrganization}
            style={{
              padding: '8px 16px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fde68a';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#fef3c7';
            }}
          >
            Leave Organization
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #f87171',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'Poppins, sans-serif',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fecaca';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#fee2e2';
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default ProfileScreen;