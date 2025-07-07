const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const HourLog = require('../models/HourLog');

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  await connectDB();

  // Apply authentication to all routes
  authenticateToken(req, res, async () => {
    try {
      if (req.method === 'GET') {
        const user = await User.findById(req.user.userId);
        const orgId = user.currentOrganization;
        const { timeRange = 'month' } = req.query;
        
        // Calculate date range based on timeRange
        const now = new Date();
        let startDate;
        switch (timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        // Get real data from database
        const [totalHours, activeProjects, completedProjects, hourLogs, projects, organization] = await Promise.all([
          HourLog.aggregate([
            { $match: { organization: orgId } },
            { $group: { _id: null, total: { $sum: '$hours' } } }
          ]),
          Project.countDocuments({ organization: orgId, status: 'active' }),
          Project.countDocuments({ organization: orgId, status: 'completed' }),
          HourLog.find({ 
            organization: orgId,
            date: { $gte: startDate.toISOString().split('T')[0] }
          }).sort({ date: 1 }),
          Project.find({ organization: orgId }).sort({ createdAt: -1 }),
          Organization.findById(orgId).populate('members.user', 'name email')
        ]);
        
        // Fix: Get member count from organization's members array
        const totalMembers = organization?.members?.length || 0;
        const totalProjects = activeProjects + completedProjects;
        
        // Calculate member performance data
        const memberPerformance = [];
        if (organization?.members) {
          for (const member of organization.members) {
            const memberId = member.user._id;
            
            // Get hours logged by this member
            const memberHours = await HourLog.aggregate([
              { $match: { organization: orgId, user: memberId } },
              { $group: { _id: null, total: { $sum: '$hours' } } }
            ]);
            
            // Get projects assigned to this member
            const memberProjects = await Project.countDocuments({
              organization: orgId,
              assignedTo: memberId
            });
            
            // Calculate member impact score
            const memberImpact = (memberProjects * 10) + ((memberHours[0]?.total || 0) * 2) + 5;
            
            memberPerformance.push({
              user: member.user,
              role: member.role,
              hours: memberHours[0]?.total || 0,
              projects: memberProjects,
              impact: memberImpact
            });
          }
        }
        
        // Calculate historical trends by month
        const months = [];
        const currentDate = new Date(startDate);
        while (currentDate <= now) {
          const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM
          const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
          
          // Get hours for this month
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          const monthHours = hourLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= monthStart && logDate <= monthEnd;
          }).reduce((sum, log) => sum + log.hours, 0);
          
          // Get projects created in this month
          const monthProjects = projects.filter(project => {
            const projectDate = new Date(project.createdAt);
            return projectDate >= monthStart && projectDate <= monthEnd;
          }).length;
          
          months.push({
            month: monthName,
            hours: monthHours,
            projects: monthProjects,
            members: totalMembers, // For now, assume member count is constant
            impact: (monthProjects * 10) + (monthHours * 2) + (totalMembers * 5)
          });
          
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Calculate growth percentages
        const currentMonth = months[months.length - 1] || { hours: 0, projects: 0, members: totalMembers, impact: 0 };
        const previousMonth = months[months.length - 2] || { hours: 0, projects: 0, members: totalMembers, impact: 0 };
        
        const hoursGrowth = previousMonth.hours > 0 ? ((currentMonth.hours - previousMonth.hours) / previousMonth.hours) * 100 : 0;
        const projectsGrowth = previousMonth.projects > 0 ? ((currentMonth.projects - previousMonth.projects) / previousMonth.projects) * 100 : 0;
        const impactGrowth = previousMonth.impact > 0 ? ((currentMonth.impact - previousMonth.impact) / previousMonth.impact) * 100 : 0;
        
        // Calculate project categories
        const categoryCounts = {};
        projects.forEach(project => {
          const category = project.category || 'other';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const projectCategories = Object.entries(categoryCounts).map(([category, count], index) => ({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          value: Math.round((count / projects.length) * 100),
          projects: count,
          hours: Math.round((totalHours[0]?.total || 0) * (count / projects.length)),
          color: colors[index % colors.length]
        }));
        
        const analyticsData = {
          overview: {
            totalHours: totalHours[0]?.total || 0,
            hoursGrowth: Math.round(hoursGrowth),
            projectsCompleted: completedProjects,
            projectsActive: activeProjects,
            membersRecruited: totalMembers,
            memberGrowth: 0, // For now, assume no member growth
            impactScore: (activeProjects * 10) + ((totalHours[0]?.total || 0) * 2) + (totalMembers * 5),
            impactGrowth: Math.round(impactGrowth)
          },
          trends: {
            projectProgress: months,
            projectCategories: projectCategories,
            memberActivity: memberPerformance
          },
          projects: { 
            performance: projects.map(project => ({
              name: project.title,
              completion: project.status === 'completed' ? 100 : project.status === 'active' ? 75 : 25,
              members: project.assignedTo?.length || 1,
              status: project.status,
              deadline: project.dueDate || new Date().toISOString()
            }))
          }
        };
        
        res.json({ data: analyticsData });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Analytics API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
} 