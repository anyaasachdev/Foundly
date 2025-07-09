import React, { useState } from 'react';
import { Plus, ArrowRight, Key, Shield, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import ApiService from '../services/api';

const OrganizationSetup = ({ onComplete }) => {
  const [step, setStep] = useState('choose'); // 'choose', 'join', 'create', 'success'
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false); // ADD THIS LINE
  const [createdOrg, setCreatedOrg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    category: 'community',
    customJoinCode: '' // Add this field
  });

  const categories = [
    { value: 'community', label: 'Community Service', emoji: '🤝' },
    { value: 'environment', label: 'Environment', emoji: '🌱' },
    { value: 'education', label: 'Education', emoji: '📚' },
    { value: 'health', label: 'Health & Wellness', emoji: '💚' },
    { value: 'arts', label: 'Arts & Culture', emoji: '🎨' },
    { value: 'technology', label: 'Technology', emoji: '💻' }
  ];

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinCodeError('Please enter a join code');
      return;
    }

    setIsValidating(true);
    setJoinCodeError('');
    
    try {
      const response = await ApiService.joinOrganization(joinCode.trim());
      console.log('Join response:', response);
      
      // Use the organization from the join response directly
      if (response && response.organization) {
        onComplete({
          type: 'joined',
          organization: response.organization
        });
        return;
      }
      
      // Handle already member case
      if (response && response.alreadyMember && response.organization) {
        onComplete({
          type: 'joined',
          organization: response.organization
        });
        return;
      }
      
      // Fallback: try to fetch orgs if response doesn't have organization
      try {
        const orgs = await ApiService.getMyOrganizations();
        console.log('Orgs after join:', orgs);
        if (orgs && orgs.organizations && orgs.organizations.length > 0) {
          onComplete({
            type: 'joined',
            organization: orgs.organizations[0]
          });
          return;
        } else if (orgs && Array.isArray(orgs) && orgs.length > 0) {
          onComplete({
            type: 'joined',
            organization: orgs[0]
          });
          return;
        } else {
          setJoinCodeError('Joined, but no organizations found. Please refresh or contact support.');
        }
      } catch (fetchError) {
        setJoinCodeError('Joined, but failed to fetch organizations. Please refresh or contact support.');
      }
    } catch (error) {
      console.log('Join error:', error);
      
      // Check if it's an "already a member" error
      if (
        error.message &&
        error.message.toLowerCase().includes('already a member')
      ) {
        // Try to fetch orgs and redirect
        try {
          const orgs = await ApiService.getMyOrganizations();
          console.log('Orgs after already-member error:', orgs);
          if (orgs && orgs.organizations && orgs.organizations.length > 0) {
            onComplete({
              type: 'joined',
              organization: orgs.organizations[0]
            });
            return;
          } else if (orgs && Array.isArray(orgs) && orgs.length > 0) {
            onComplete({
              type: 'joined',
              organization: orgs[0]
            });
            return;
          }
        } catch (fetchError) {
          console.log('Failed to fetch orgs after already-member error:', fetchError);
        }
      }
      
      setJoinCodeError(error.message || 'Invalid join code. Please verify with your organization admin.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateOrg = async () => {
    // Clear any previous errors
    console.log('Starting organization creation...');
    
    // Basic validation
    if (!newOrgData.name.trim()) {
      alert('Please enter an organization name');
      return;
    }
    
    if (!newOrgData.description.trim()) {
      alert('Please enter an organization description');
      return;
    }
    
    if (!newOrgData.customJoinCode.trim()) {
      alert('Please enter a custom join code (6-10 characters)');
      return;
    }
    
    if (newOrgData.customJoinCode.length < 6 || newOrgData.customJoinCode.length > 10) {
      alert('Join code must be between 6-10 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Sending data:', newOrgData);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const apiPromise = ApiService.createOrganization(newOrgData);
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      console.log('Response received:', response);
      
      if (response && response.organization) {
        setCreatedOrg(response.organization);
        setStep('success');
        console.log('Organization created successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Create org error:', error);
      
      // More specific error handling
      let errorMessage = 'Failed to create organization. ';
      
      if (error.message === 'Request timeout') {
        errorMessage += 'The request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('join code')) {
        errorMessage += error.message;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage += 'Network error. Please check if the backend server is running.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('Loading state cleared');
    }
  };

  const copyJoinCode = async () => {
    if (createdOrg?.joinCode) {
      try {
        await navigator.clipboard.writeText(createdOrg.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = createdOrg.joinCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const finishSetup = () => {
    console.log('finishSetup called with:', createdOrg);
    onComplete({
      type: 'created',
      organization: createdOrg
    });
  };

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '2.5rem',
            color: '#1F2937',
            fontWeight: '700',
            fontFamily: 'Poppins, sans-serif'
          }}>Organization Created!</h1>
          
                        <p style={{
                margin: '0 0 30px 0',
                fontSize: '1.1rem',
                color: '#6B7280',
                lineHeight: '1.6',
                fontFamily: 'Poppins, sans-serif'
              }}>Congratulations! You're now the admin of <strong>{createdOrg?.name}</strong>.</p>
              
              <button
                onClick={finishSetup}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  marginBottom: '20px'
                }}
              >
                Continue to Dashboard
                <ArrowRight size={20} />
              </button>
          
          <div style={{
            background: '#F3F4F6',
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              <Key size={20} />
              Your Organization Join Code
            </h3>
            
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px'
            }}>
              <code style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1F2937',
                letterSpacing: '2px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                {createdOrg?.joinCode}
              </code>
              
              <button
                onClick={copyJoinCode}
                style={{
                  padding: '10px',
                  background: copied ? '#10B981' : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#6B7280',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Share this code with others to invite them to your organization. Keep it secure!
            </p>
          </div>
          
          <button
            onClick={finishSetup}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            Continue to Dashboard
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '2rem'
          }}>⭐</div>
          
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '2.5rem',
            color: '#1F2937',
            fontWeight: '700',
            fontFamily: 'Poppins, sans-serif'
          }}>Welcome to Foundly!</h1>
          
          <p style={{
            margin: '0 0 40px 0',
            fontSize: '1.1rem',
            color: '#6B7280',
            lineHeight: '1.6',
            fontFamily: 'Poppins, sans-serif'
          }}>Connect with your youth organization securely. Join with an invite code or start your own organization.</p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <button
              onClick={() => setStep('join')}
              style={{
                padding: '30px 20px',
                background: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#374151';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 15px -3px rgba(55, 65, 81, 0.1), 0 4px 6px -2px rgba(55, 65, 81, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'white'
              }}>
                <Key size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Join with Code</h3>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>Enter your organization's secure invite code</p>
            </button>
            
            <button
              onClick={() => setStep('create')}
              style={{
                padding: '30px 20px',
                background: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#374151';
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 20px 25px -5px rgba(55, 65, 81, 0.1), 0 10px 10px -5px rgba(55, 65, 81, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'white'
              }}>
                <Plus size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Poppins, sans-serif' }}>Create Organization</h3>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem', fontFamily: 'Poppins, sans-serif' }}>Start your own youth-led organization</p>
            </button>
          </div>
          
          <div style={{
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Shield size={20} style={{ color: '#0284C7', flexShrink: 0 }} />
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#0284C7',
              textAlign: 'left'
            }}>
              <strong>Secure Access:</strong> All organizations require verified invite codes to ensure member safety and privacy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'join') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={() => setStep('choose')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: '20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#374151'}
            onMouseLeave={(e) => e.target.style.color = '#6B7280'}
          >
            ← Back to options
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white'
            }}>
              <Key size={32} />
            </div>
            <h1 style={{
              margin: '0 0 10px 0',
              fontSize: '2rem',
              color: '#1F2937',
              fontWeight: '700',
              fontFamily: 'Poppins, sans-serif'
            }}>Join Organization</h1>
            <p style={{
              margin: 0,
              color: '#6B7280',
              fontSize: '1rem',
              fontFamily: 'Poppins, sans-serif'
            }}>Enter the secure invite code provided by your organization admin</p>
          </div>
          
          <form onSubmit={handleJoinSubmit}>
            <div style={{
              background: '#F8FAFC',
              border: '2px solid #E5E7EB',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px'
              }}>
                <Key size={20} style={{ color: '#374151' }} />
                <h3 style={{ margin: 0, color: '#1F2937', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>Organization Invite Code</h3>
              </div>
              
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  const value = ((e.target.value || '') + '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                  setJoinCode(value);
                  setJoinCodeError('');
                }}
                placeholder="Enter invite code (e.g., ABC12345)"
                disabled={isValidating}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${joinCodeError ? '#EF4444' : (joinCode.length >= 6 ? '#10B981' : '#E5E7EB')}`,
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  fontFamily: 'Inter, ui-monospace, SFMono-Regular, monospace',
                  fontWeight: '600',
                  textAlign: 'center',
                  background: isValidating ? '#F3F4F6' : '#FFFFFF',
                  transition: 'border-color 0.2s ease'
                }}
                maxLength={10}
              />
              
              {joinCodeError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '12px',
                  padding: '12px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px'
                }}>
                  <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <p style={{
                    margin: 0,
                    color: '#EF4444',
                    fontSize: '0.9rem'
                  }}>
                    {joinCodeError}
                  </p>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!joinCode.trim() || isValidating}
              style={{
                width: '100%',
                padding: '16px',
                background: (joinCode.trim() && !isValidating)
                  ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
                  : '#E5E7EB',
                color: (joinCode.trim() && !isValidating) ? 'white' : '#9CA3AF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (joinCode.trim() && !isValidating) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              {isValidating ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #9CA3AF',
                    borderTop: '2px solid #FFFFFF',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Validating...
                </>
              ) : (
                <>
                  Join Organization
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
          
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            fontSize: '0.9rem',
            color: '#92400E'
          }}>
            <strong>Need an invite code?</strong> Contact your organization's admin or the person who invited you to get your secure access code.
          </div>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={() => setStep('choose')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: '20px',
              fontSize: '0.9rem'
            }}
          >
            ← Back to options
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white'
            }}>
              <Plus size={32} />
            </div>
            <h1 style={{
              margin: '0 0 10px 0',
              fontSize: '2rem',
              color: '#1F2937',
              fontWeight: '700',
              fontFamily: 'Poppins, sans-serif'
            }}>Create Your Organization</h1>
            
            <p style={{
              margin: '0 0 30px 0',
              color: '#6B7280',
              fontSize: '1rem',
              fontFamily: 'Poppins, sans-serif'
            }}>Tell us about your new youth-led organization</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreateOrg(); }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151',
                fontFamily: 'Poppins, sans-serif'
              }}>Organization Name *</label>
              <input
                type="text"
                value={newOrgData.name}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Poppins, sans-serif'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>Description *</label>
              <textarea
                value={newOrgData.description}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your organization's mission and goals"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>Category *</label>
              <select
                value={newOrgData.category}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  background: '#FFFFFF'
                }}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>Location</label>
              <input
                type="text"
                value={newOrgData.location}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, State/Country"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>Website (Optional)</label>
              <input
                type="url"
                value={newOrgData.website}
                onChange={(e) => setNewOrgData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourorganization.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>Custom Join Code *</label>
              <input
                type="text"
                value={newOrgData.customJoinCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setNewOrgData(prev => ({ ...prev, customJoinCode: value }));
                }}
                placeholder="Enter a unique join code (6-10 characters)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${newOrgData.customJoinCode.length >= 6 && newOrgData.customJoinCode.length <= 10 ? '#10B981' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'monospace'
                }}
                maxLength={10}
                required
              />
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.8rem',
                color: newOrgData.customJoinCode.length >= 6 && newOrgData.customJoinCode.length <= 10 ? '#10B981' : '#6B7280'
              }}>This code will be used by members to join your organization ({newOrgData.customJoinCode.length}/10 characters)</p>
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Create Organization
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }
};

export default OrganizationSetup;