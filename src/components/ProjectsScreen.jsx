import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Users, Calendar, MoreVertical, Target, Clock, CheckCircle, X } from 'lucide-react';
import ApiService from '../services/api';
import { toast } from 'react-hot-toast';

const ProjectsScreen = ({ user }) => {
  const [activeTab, setActiveTab] = useState('current');
  const [organization, setOrganization] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'community',
    priority: 'medium',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignedTo: []
  });
  
  useEffect(() => {
    loadOrganizationData();
    loadProjects();
    loadMembers();
  }, []);
  
  // Refresh data periodically to ensure syncing
  useEffect(() => {
    const interval = setInterval(() => {
      loadProjects();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);
  
  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle dropdown closing, not modal closing
      if (selectedProject && !event.target.closest('.project-card') && !showDetailsModal) {
        setSelectedProject(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedProject, showDetailsModal]);
  
  const loadOrganizationData = async () => {
    try {
      const response = await ApiService.getMyOrganizations();
      const currentOrgId = localStorage.getItem('currentOrganization');
      const currentOrg = response.organizations.find(org => org._id === currentOrgId);
      
      if (currentOrg) {
        setOrganization(currentOrg);
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  };
  
  const loadProjects = async () => {
    const currentOrgId = localStorage.getItem('currentOrganization');
    if (!currentOrgId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await ApiService.getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        name: newProject.title, // API expects 'name' not 'title'
        description: newProject.description,
        startDate: new Date().toISOString(), // API expects 'startDate'
        endDate: newProject.dueDate, // API expects 'endDate'
        status: 'active',
        organizationId: localStorage.getItem('currentOrganization') || 'default'
      };
      
      console.log('Creating project with data:', projectData);
      const response = await ApiService.createProject(projectData);
      console.log('Project creation response:', response);
      
      if (response.success || response.message) {
        // Reload projects to get the updated list
        await loadProjects();
        setShowCreateModal(false);
        setNewProject({
          title: '',
          description: '',
          dueDate: '',
          priority: 'medium',
          category: 'community',
          assignedTo: []
        });
        toast.success('Project created successfully!');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    }
  };
  
  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };
  
  const loadMembers = async () => {
    try {
      const response = await ApiService.getUsers();
      const allMembers = response.users || [];
      
      // Ensure current user is included
      const currentUserIncluded = allMembers.some(member => 
        member._id === user._id || member._id === user.id
      );
      
      if (!currentUserIncluded && user) {
        // Add current user if not already in the list
        allMembers.unshift({
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          color: user.color || '#667eea'
        });
      }
      
      setMembers(allMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
      // Fallback: at least include current user
      if (user) {
        setMembers([{
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          color: user.color || '#667eea'
        }]);
      } else {
        setMembers([]);
      }
    }
  };
  
  const handleUpdateProjectStatus = async (projectId, newStatus) => {
    try {
      const response = await ApiService.updateProject(projectId, { status: newStatus });
      
      // Update the project in the projects array
      setProjects(prev => prev.map(project =>
        project._id === projectId
          ? { ...project, status: newStatus }
          : project
      ));
      
      // Remove from selectedProject if status changed
      setSelectedProject(null);
      
      // Show success feedback
      toast.success(`Project marked as ${newStatus}`);
      
      // Close the modal after successful update
      setShowDetailsModal(false);
      
      // Immediately reload projects to ensure UI sync
      await loadProjects();
      
      // Move to the correct tab if needed
      setActiveTab(newStatus === 'completed' ? 'past' : 'current');
    } catch (error) {
      console.error('Failed to update project status:', error);
      toast.error('Failed to update project status. Please try again.');
    }
  };
  
  const handleAssignMember = async (projectId, memberId) => {
    try {
      console.log('Assigning member:', projectId, memberId);
      const response = await ApiService.updateProject(projectId, { 
        $addToSet: { assignedTo: memberId }
      });
      console.log('Member assignment response:', response);
      
      // Update the project in the projects array
      setProjects(prev => prev.map(project => {
        if (project._id === projectId) {
          const currentAssigned = project.assignedTo || [];
          const isAlreadyAssigned = currentAssigned.includes(memberId);
          if (!isAlreadyAssigned) {
            return { ...project, assignedTo: [...currentAssigned, memberId] };
          }
        }
        return project;
      }));
      
      // Update selectedProject if it's the same project
      setSelectedProject(prev => {
        if (prev && prev._id === projectId) {
          const currentAssigned = prev.assignedTo || [];
          const isAlreadyAssigned = currentAssigned.includes(memberId);
          if (!isAlreadyAssigned) {
            return { ...prev, assignedTo: [...currentAssigned, memberId] };
          }
        }
        return prev;
      });
      
      // Show success feedback
      toast.success('Member assigned successfully');
    } catch (error) {
      console.error('Failed to assign member:', error);
      toast.error('Failed to assign member. Please try again.');
    }
  };
  
  const handleUpdateProjectProgress = async (projectId, newProgress) => {
    try {
      const response = await ApiService.updateProject(projectId, { progress: newProgress });
      // Update the project in the projects array
      setProjects(prev => {
        const updated = prev.map(project => 
          project._id === projectId 
            ? { ...project, progress: newProgress }
            : project
        );
        // Also update selectedProject with the new object from the array
        const updatedProject = updated.find(p => p._id === projectId);
        if (updatedProject) setSelectedProject(updatedProject);
        return updated;
      });
      // Show success feedback
      toast.success(`Project progress updated to ${newProgress}%`);
    } catch (error) {
      console.error('Failed to update project progress:', error);
      toast.error('Failed to update project progress. Please try again.');
    }
  };
  
  const filteredProjects = projects.filter(project => {
    switch (activeTab) {
      case 'current':
        return project.status === 'active';
      case 'past':
        return project.status === 'completed';
      default:
        return true;
    }
  });
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'environment': return '🌱';
      case 'education': return '📚';
      case 'technology': return '💻';
      case 'health': return '🏥';
      case 'community': return '🤝';
      default: return '📋';
    }
  };
  
  return (
    <div className="projects-container" style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingTop: '90px',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Organization Header */}
      {organization && (
        <div style={{
          background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          borderRadius: '15px',
          padding: '25px',
          marginBottom: '30px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px', fontFamily: 'Poppins, sans-serif' }}>
            {organization.name} Projects
          </h1>
          <p style={{ opacity: 0.9, fontFamily: 'Poppins, sans-serif' }}>
            Manage and track all organization projects
          </p>
        </div>
      )}
      
      {/* Header */}
      <div className="projects-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '5px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Projects
          </h2>
          <p style={{ color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
            Collaborate on meaningful projects that make a difference
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
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
            <Plus size={16} />
            Create Project
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="project-tabs" style={{
        display: 'flex',
        gap: '5px',
        marginBottom: '30px',
        background: '#F3F4F6',
        padding: '5px',
        borderRadius: '10px',
        width: 'fit-content'
      }}>
        {[
          { key: 'current', label: 'Current', count: projects.filter(p => p.status === 'active').length },
          { key: 'past', label: 'Past', count: projects.filter(p => p.status === 'completed').length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#8B5CF6' : '#6B7280',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              boxShadow: activeTab === tab.key ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '15px',
          border: '2px dashed #D1D5DB'
        }}>
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#1F2937' }}>
            No {activeTab} projects
          </h3>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>
            {activeTab === 'current' ? 'Start a new project to make an impact!' : `No projects in ${activeTab} status.`}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
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
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '25px'
        }}>
          {filteredProjects.map((project) => (
            <div
              key={`${project._id}-${project.progress || 0}`}
              className="project-card"
              style={{
                background: 'white',
                borderRadius: '15px',
                padding: '25px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
              }}
            >
              {/* Project Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getCategoryIcon(project.category)}</span>
                  <div>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: '#1F2937',
                      marginBottom: '5px'
                    }}>
                      {project.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: getPriorityColor(project.priority),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {project.priority.toUpperCase()}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        background: project.color + '20',
                        color: project.color,
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {project.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '5px'
                }}>
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {/* Project Description */}
              <p style={{
                color: '#6B7280',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                {project.description}
              </p>
              
              {/* Tasks Preview */}
              {project.tasks && project.tasks.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '10px'
                  }}>
                    Recent Tasks
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(project.tasks || []).slice(0, 3).map((task) => (
                      <div key={task.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: '#F9FAFB',
                        borderRadius: '6px'
                      }}>
                        <CheckCircle 
                          className={`w-4 h-4 ${
                            task.completed ? 'text-green-500' : 'text-gray-300'
                          }`}
                        />
                        <span style={{
                          fontSize: '0.875rem',
                          color: task.completed ? '#6B7280' : '#374151',
                          textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Project Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '1px solid #E5E7EB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Due {new Date(project.dueDate).toLocaleDateString()}
                  </span>
                </div>
                
                <button 
                  onClick={() => handleViewDetails(project)}
                  style={{
                    padding: '8px 16px',
                    background: project.color || '#8B5CF6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create Project Modal */}
      {showCreateModal && (
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
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#1F2937'
            }}>
              Create New Project
            </h2>
            
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '5px'
                }}>
                  Project Title
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter project title..."
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '5px'
                }}>
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                  placeholder="Describe your project..."
                />
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '5px'
                  }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '5px'
                  }}>
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject(prev => ({ ...prev, priority: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '5px'
                }}>
                  Category
                </label>
                <select
                  value={newProject.category}
                  onChange={(e) => setNewProject(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="community">🤝 Community</option>
                  <option value="environment">🌱 Environment</option>
                  <option value="education">📚 Education</option>
                  <option value="technology">💻 Technology</option>
                  <option value="health">🏥 Health</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '5px'
                }}>
                  Assign Team Members
                </label>
                <div style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '15px',
                  minHeight: '80px',
                  background: '#F9FAFB'
                }}>
                  {members.length > 0 ? (
                    <div>
                      {/* Select All Option */}
                      <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #E5E7EB' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const currentAssigned = newProject.assignedTo || [];
                            const allMemberIds = members.map(m => m._id);
                            const allSelected = allMemberIds.every(id => currentAssigned.includes(id));
                            
                            if (allSelected) {
                              // Deselect all
                              setNewProject(prev => ({ ...prev, assignedTo: [] }));
                            } else {
                              // Select all
                              setNewProject(prev => ({ ...prev, assignedTo: allMemberIds }));
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: (newProject.assignedTo || []).length === members.length && members.length > 0
                              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                              : '#E5E7EB',
                            color: (newProject.assignedTo || []).length === members.length && members.length > 0 ? 'white' : '#374151',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>
                            {(newProject.assignedTo || []).length === members.length && members.length > 0 ? '☑️' : '☐'}
                          </span>
                          Select All ({members.length} members)
                        </button>
                      </div>
                      
                      {/* Individual Members */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {members.map((member) => (
                          <button
                            key={member._id}
                            type="button"
                            onClick={() => {
                              const currentAssigned = newProject.assignedTo || [];
                              const isAssigned = currentAssigned.includes(member._id);
                              
                              if (isAssigned) {
                                setNewProject(prev => ({
                                  ...prev,
                                  assignedTo: currentAssigned.filter(id => id !== member._id)
                                }));
                              } else {
                                setNewProject(prev => ({
                                  ...prev,
                                  assignedTo: [...currentAssigned, member._id]
                                }));
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              background: (newProject.assignedTo || []).includes(member._id)
                                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                : '#E5E7EB',
                              color: (newProject.assignedTo || []).includes(member._id) ? 'white' : '#374151',
                              border: 'none',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              boxShadow: (newProject.assignedTo || []).includes(member._id) ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!(newProject.assignedTo || []).includes(member._id)) {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(newProject.assignedTo || []).includes(member._id)) {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${member.color || '#667eea'} 0%, ${member.color || '#5a67d8'} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {(member.name || '').charAt(0).toUpperCase()}
                            </div>
                            <span>{member.name}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                              {(newProject.assignedTo || []).includes(member._id) ? '✓' : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: '#6B7280',
                      fontSize: '0.875rem',
                      padding: '20px'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
                      No members available
                    </div>
                  )}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  marginTop: '5px'
                }}>
                  {newProject.assignedTo && newProject.assignedTo.length > 0 
                    ? `${newProject.assignedTo.length} member${newProject.assignedTo.length === 1 ? '' : 's'} selected`
                    : 'Click on members to assign them to this project'
                  }
                </p>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: '500'
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
                    fontWeight: '500'
                  }}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Project Details Modal */}
      {showDetailsModal && selectedProject && (
        <div 
          style={{
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
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '15px',
              padding: '30px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1F2937'
              }}>
                Project Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '10px'
              }}>
                {selectedProject.title}
              </h3>
              <p style={{
                color: '#6B7280',
                lineHeight: '1.6',
                marginBottom: '15px'
              }}>
                {selectedProject.description}
              </p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px',
                background: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '5px'
                }}>
                  Category
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {getCategoryIcon(selectedProject.category)} {selectedProject.category}
                </div>
              </div>
              
              <div style={{
                padding: '15px',
                background: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '5px'
                }}>
                  Priority
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: getPriorityColor(selectedProject.priority)
                }}>
                  {(selectedProject.priority || '').charAt(0).toUpperCase() + (selectedProject.priority || '').slice(1)}
                </div>
              </div>
              
              <div style={{
                padding: '15px',
                background: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '5px'
                }}>
                  Status
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {(selectedProject.status || '').charAt(0).toUpperCase() + (selectedProject.status || '').slice(1)}
                </div>
              </div>
              
              <div style={{
                padding: '15px',
                background: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '5px'
                }}>
                  Due Date
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {new Date(selectedProject.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* Member Assignment Section */}
            <div style={{
              width: '100%',
              marginBottom: '20px',
              padding: '15px',
              background: '#F9FAFB',
              borderRadius: '8px'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '10px'
              }}>
                Assign Members
              </h4>
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {members.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => handleAssignMember(selectedProject._id, member._id)}
                    style={{
                      padding: '8px 12px',
                      background: selectedProject.assignedTo?.includes(member._id) 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : '#F3F4F6',
                      color: selectedProject.assignedTo?.includes(member._id) ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Update Section */}
            {selectedProject.status === 'active' && (
              <button
                onClick={() => handleUpdateProjectStatus(selectedProject._id, 'completed')}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  width: '100%',
                  marginBottom: '15px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                ✅ Mark as Completed
              </button>
            )}
            
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsScreen;