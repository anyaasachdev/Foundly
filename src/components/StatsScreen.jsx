import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Award, Calendar, BarChart3, PieChart, Activity, Download, Filter, RefreshCw, Eye, ArrowUp, ArrowDown, Clock, CheckCircle, AlertCircle, Star, Zap, Globe, MessageSquare, FileText, Settings, Info } from 'lucide-react';
import ApiService from '../services/api';
import { toast } from 'react-hot-toast';

const StatsScreen = ({ user }) => {
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState('overview'); // overview, projects, team (removed reports)
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('hours');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);
  
  // Refresh data periodically to ensure syncing
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);
  
  const getDefaultData = (statsData) => {
    const currentHours = statsData?.totalHours || 0;
    const currentProjects = statsData?.activeProjects || 0;
    const currentMembers = statsData?.totalMembers || 1;
    const currentImpact = (currentProjects * 10) + (currentHours * 2) + (currentMembers * 5);
    
    return {
      overview: {
        totalHours: currentHours,
        hoursGrowth: 0,
        projectsCompleted: statsData?.completedTasks || 0,
        projectsActive: currentProjects,
        membersRecruited: currentMembers,
        memberGrowth: 0,
        impactScore: currentImpact,
        impactGrowth: 0
      },
      trends: {
        projectProgress: [
          { month: 'Jan', hours: Math.max(0, currentHours - 50), projects: Math.max(0, currentProjects - 2), members: Math.max(1, currentMembers - 1), impact: Math.max(0, currentImpact - 100) },
          { month: 'Feb', hours: Math.max(0, currentHours - 40), projects: Math.max(0, currentProjects - 1), members: Math.max(1, currentMembers), impact: Math.max(0, currentImpact - 80) },
          { month: 'Mar', hours: Math.max(0, currentHours - 30), projects: currentProjects, members: currentMembers, impact: Math.max(0, currentImpact - 60) },
          { month: 'Apr', hours: Math.max(0, currentHours - 20), projects: currentProjects, members: currentMembers, impact: Math.max(0, currentImpact - 40) },
          { month: 'May', hours: Math.max(0, currentHours - 10), projects: currentProjects, members: currentMembers, impact: Math.max(0, currentImpact - 20) },
          { month: 'Jun', hours: currentHours, projects: currentProjects, members: currentMembers, impact: currentImpact }
        ],
        projectCategories: [],
        memberActivity: []
      },
      projects: { performance: [] }
    };
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      console.log('Loading analytics for timeRange:', timeRange);
      
      // Get both stats and analytics data
      const [statsResponse, analyticsResponse] = await Promise.all([
        ApiService.getStats(),
        ApiService.getAnalytics(timeRange)
      ]);
      
      console.log('Stats response:', statsResponse);
      console.log('Analytics response:', analyticsResponse);
      
      const stats = statsResponse.stats || {};
      const analytics = analyticsResponse.analytics || {};
      
      setAnalyticsData({
        totalHours: stats.totalHours || 0,
        activeProjects: stats.activeProjects || 0,
        completedTasks: stats.completedTasks || 0,
        totalMembers: stats.totalMembers || 0,
        totalProjects: stats.totalProjects || 0,
        trends: analytics.trends || [],
        summary: analytics.summary || {}
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setAnalyticsData(getDefaultData({}));
      setLoading(false);
    }
  };
  

  
  const exportData = async (format) => {
    try {
      const response = await ApiService.exportAnalytics({
        timeRange,
        format,
        includeCharts: true
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export analytics');
    }
  };
  
  const StatCard = ({ title, value, change, icon: Icon, color, subtitle, trend, infoTooltip, isHighlighted }) => (
    <div style={{
      background: isHighlighted ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' : '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: isHighlighted ? '0 8px 32px rgba(139, 92, 246, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
      border: isHighlighted ? 'none' : '1px solid #E5E7EB',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
      fontFamily: 'Poppins, sans-serif',
      color: isHighlighted ? 'white' : 'inherit'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = isHighlighted ? '0 12px 40px rgba(139, 92, 246, 0.4)' : '0 8px 24px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = isHighlighted ? '0 8px 32px rgba(139, 92, 246, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)';
    }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: isHighlighted ? 'rgba(255, 255, 255, 0.2)' : `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={isHighlighted ? 'white' : color} />
        </div>
        {infoTooltip && (
          <div style={{ position: 'relative' }}>
            <Info 
              size={16} 
              color={isHighlighted ? 'rgba(255, 255, 255, 0.8)' : '#6B7280'} 
              style={{ cursor: 'help' }}
              onMouseEnter={(e) => {
                const tooltip = document.createElement('div');
                tooltip.style.cssText = `
                  position: absolute;
                  top: 100%;
                  right: 0;
                  background: #1F2937;
                  color: white;
                  padding: 8px 12px;
                  border-radius: 6px;
                  font-size: 0.75rem;
                  white-space: nowrap;
                  z-index: 1000;
                  margin-top: 4px;
                  max-width: 200px;
                  white-space: normal;
                `;
                tooltip.textContent = infoTooltip;
                e.target.parentElement.appendChild(tooltip);
              }}
              onMouseLeave={(e) => {
                const tooltip = e.target.parentElement.querySelector('div');
                if (tooltip) tooltip.remove();
              }}
            />
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: isHighlighted ? 'white' : '#1F2937',
          marginBottom: '4px'
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: isHighlighted ? 'rgba(255, 255, 255, 0.8)' : '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {subtitle}
        </div>
      </div>
      
      {change !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.875rem',
          color: change >= 0 ? (isHighlighted ? 'rgba(255, 255, 255, 0.9)' : '#10B981') : (isHighlighted ? 'rgba(255, 255, 255, 0.9)' : '#EF4444')
        }}>
          {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  );
  
  const MetricChart = ({ data, metric, title }) => {
    const maxValue = Math.max(...data.map(item => item[metric])) || 1;
    
    const getMetricLabel = (metric) => {
      switch (metric) {
        case 'hours': return 'Hours Logged';
        case 'projects': return 'Projects Total';
        case 'members': return 'Team Members';
        case 'impact': return 'Impact Score';
        default: return metric;
      }
    };
    
    const getMetricDescription = (metric) => {
      switch (metric) {
        case 'hours': return 'Total volunteer hours contributed';
        case 'projects': return 'Total projects created';
        case 'members': return 'Active team members';
        case 'impact': return 'Community impact score (projects×10 + hours×2 + members×5)';
        default: return '';
      }
    };
    
    return (
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#1F2937', fontSize: '1.125rem' }}>{title}</h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>{getMetricDescription(selectedMetric)}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'hours', label: 'Hours' },
              { key: 'projects', label: 'Projects' },
              { key: 'members', label: 'Members' },
              { key: 'impact', label: 'Impact' }
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedMetric === m.key ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : '#F3F4F6',
                  color: selectedMetric === m.key ? 'white' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  textTransform: 'uppercase'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'end',
          gap: '12px',
          height: '200px',
          padding: '20px 0'
        }}>
          {data.map((item, index) => {
            const value = item[selectedMetric];
            const height = (value / maxValue) * 160;
            
            return (
              <div key={item.month} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: `${height}px`,
                  background: `linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '8px',
                  transition: 'height 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  const tooltip = document.createElement('div');
                  tooltip.style.cssText = `
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1F2937;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    white-space: nowrap;
                    z-index: 1000;
                    margin-bottom: 4px;
                  `;
                  tooltip.textContent = `${getMetricLabel(selectedMetric)}: ${value}`;
                  e.target.appendChild(tooltip);
                }}
                onMouseLeave={(e) => {
                  const tooltip = e.target.querySelector('div');
                  if (tooltip) tooltip.remove();
                }}
                />
                <span style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  fontWeight: '500'
                }}>{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const ProjectPerformanceTable = ({ projects }) => (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#1F2937' }}>Project Performance</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '12px 0', color: '#6B7280', fontWeight: '600', fontSize: '0.875rem' }}>Project</th>
              <th style={{ textAlign: 'center', padding: '12px 0', color: '#6B7280', fontWeight: '600', fontSize: '0.875rem' }}>Team</th>
              <th style={{ textAlign: 'center', padding: '12px 0', color: '#6B7280', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
              <th style={{ textAlign: 'center', padding: '12px 0', color: '#6B7280', fontWeight: '600', fontSize: '0.875rem' }}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '16px 0' }}>
                  <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '2px' }}>{project.name}</div>
                </td>
                <td style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Users size={14} color="#6B7280" />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{project.members}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 0', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: project.status === 'completed' ? '#D1FAE5' : '#FEF3C7',
                    color: project.status === 'completed' ? '#065F46' : '#92400E'
                  }}>
                    {project.status === 'completed' ? 'Completed' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '16px 0', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
                  {new Date(project.deadline).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  const TeamLeaderboard = ({ members }) => (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#1F2937' }}>Team Leaderboard</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {members.map((member, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px',
            borderRadius: '12px',
            background: index < 3 ? '#F8FAFC' : 'transparent',
            border: index < 3 ? '1px solid #E2E8F0' : 'none'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: index < 3 ? 'white' : '#6B7280'
              }}>
                {index + 1}
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}>
                {member.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '2px' }}>{member.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{member.role}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', color: '#374151', fontSize: '1.125rem' }}>{member.impactScore || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{member.projects} projects</div>
            </div>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: member.status === 'active' ? '#10B981' : '#E5E7EB'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        background: '#FFFFFF',
        borderRadius: '16px',
        margin: '20px',
        marginTop: '90px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p style={{ color: '#6B7280' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }
  
  // Add null check for analyticsData before using it
  if (!analyticsData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        background: '#FFFFFF',
        borderRadius: '16px',
        margin: '20px',
        marginTop: '90px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B7280' }}>No analytics data available</p>
        </div>
      </div>
    );
  }
  
  const data = analyticsData || getDefaultData({});
  
  return (
    <div className="stats-screen" style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingTop: '90px',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <div className="stats-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '5px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Analytics Dashboard
          </h1>
          <p style={{ color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
            Track your organization's performance and impact
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
          {/* Time Range Selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timeRange === range ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : '#F3F4F6',
                  color: timeRange === range ? 'white' : '#6B7280',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                {range}
              </button>
            ))}
          </div>
          
          {/* Action Buttons - REMOVED */}
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '32px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'projects', label: 'Projects', icon: Target },
          { id: 'team', label: 'Team', icon: Users }
          // Removed reports tab
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#374151' : '#6B7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              borderBottom: activeTab === tab.id ? '2px solid #374151' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <StatCard
              title="Total Hours"
              value={data.totalHours?.toLocaleString() || '0'}
              change={undefined}
              icon={Clock}
              color="#374151"
              subtitle="Hours contributed"
              trend={[]}
            />
            <StatCard
              title="Active Projects"
              value={data.activeProjects || 0}
              change={undefined}
              icon={Target}
              color="#10B981"
              subtitle={`${data.completedTasks || 0} completed`}
              trend={[]}
            />
            <StatCard
              title="Team Members"
              value={data.totalMembers || 0}
              change={undefined}
              icon={Users}
              color="#F59E0B"
              subtitle="Active contributors"
              trend={[]}
            />
            <StatCard
              title="Impact Score"
              value={((data.activeProjects || 0) * 10 + (data.totalHours || 0) * 2 + (data.totalMembers || 0) * 5).toLocaleString()}
              change={undefined}
              icon={Award}
              color="#8B5CF6"
              subtitle="Community impact"
              trend={[]}
              infoTooltip="Impact Score is calculated as: (Active Projects × 10) + (Total Hours × 2) + (Team Members × 5)"
              isHighlighted={true}
            />
          </div>
          
          {/* Charts Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <MetricChart
              data={data.trends && data.trends.length > 0 ? data.trends : getDefaultData(data).trends.projectProgress}
              metric={selectedMetric}
              title="Performance Trends"
            />
          </div>
        </>
      )}
      
      {activeTab === 'projects' && (
        <>
          <ProjectPerformanceTable projects={(data.projects?.performance || [])} />
          

        </>
      )}
      
      {activeTab === 'team' && (
        <>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1F2937' }}>Team Performance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[]?.map((member, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: index < 3 ? '#F8FAFC' : 'transparent',
                  border: index < 3 ? '1px solid #E2E8F0' : 'none'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} 0%, ${['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED'][index % 5]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}>
                    {member.user?.name?.[0]?.toUpperCase() || 'M'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '2px' }}>
                      {member.user?.name || 'Member'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      {member.role || 'Member'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
                        {member.hours || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Hours</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
                        {member.projects || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Projects</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
                        {member.impact || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Impact</div>
                    </div>
                  </div>
                </div>
              ))}
              {(![] || [].length === 0) && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6B7280'
                }}>
                  <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No team members yet</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Team performance data will appear as members join and become active.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'reports' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <FileText size={48} color="#8B5CF6" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#1F2937' }}>Custom Reports</h3>
          <p style={{ margin: '0 0 24px 0', color: '#6B7280' }}>Generate detailed reports for your organization</p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            {[
              { title: 'Impact Report', desc: 'Comprehensive impact analysis', icon: Globe },
              { title: 'Financial Summary', desc: 'Budget and expense tracking', icon: BarChart3 },
              { title: 'Member Report', desc: 'Team performance insights', icon: Users },
              { title: 'Project Analysis', desc: 'Detailed project breakdowns', icon: Target }
            ].map((report, index) => (
              <div key={index} style={{
                padding: '20px',
                borderRadius: '12px',
                border: '2px dashed #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#8B5CF6';
                e.target.style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.background = 'transparent';
              }}
              >
                <report.icon size={32} color="#8B5CF6" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#1F2937' }}>{report.title}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>{report.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsScreen;

{/* Remove the entire reports section (lines 898-950) */}