const express = require('express');
const router = express.Router();
const HourLog = require('../models/HourLog');
const auth = require('../middleware/auth');

// Get all hours for the current user's organization
router.get('/', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const hours = await HourLog.find({ organization: organizationId })
      .populate('user', 'name email')
      .populate('project', 'name')
      .populate('approvedBy', 'name')
      .sort({ date: -1 });

    res.json({ data: hours });
  } catch (error) {
    console.error('Error fetching hours:', error);
    res.status(500).json({ error: 'Failed to fetch hours' });
  }
});

// Log new hours
router.post('/', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { hours, description, date, project, category } = req.body;

    if (!hours || !description || !date) {
      return res.status(400).json({ error: 'Hours, description, and date are required' });
    }

    const hourLog = new HourLog({
      user: req.user.id,
      organization: organizationId,
      hours: parseFloat(hours),
      description,
      date: new Date(date),
      project: project || null,
      category: category || 'volunteer'
    });

    await hourLog.save();

    // Populate user info for response
    await hourLog.populate('user', 'name email');

    res.status(201).json({ 
      message: 'Hours logged successfully',
      data: hourLog 
    });
  } catch (error) {
    console.error('Error logging hours:', error);
    res.status(500).json({ error: 'Failed to log hours' });
  }
});

// Update hours (only by the user who created them or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const hourLog = await HourLog.findById(req.params.id);
    
    if (!hourLog) {
      return res.status(404).json({ error: 'Hour log not found' });
    }

    // Check if user can edit this hour log
    if (hourLog.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this hour log' });
    }

    const { hours, description, date, project, category } = req.body;

    if (hours !== undefined) hourLog.hours = parseFloat(hours);
    if (description !== undefined) hourLog.description = description;
    if (date !== undefined) hourLog.date = new Date(date);
    if (project !== undefined) hourLog.project = project;
    if (category !== undefined) hourLog.category = category;

    await hourLog.save();
    await hourLog.populate('user', 'name email');

    res.json({ 
      message: 'Hours updated successfully',
      data: hourLog 
    });
  } catch (error) {
    console.error('Error updating hours:', error);
    res.status(500).json({ error: 'Failed to update hours' });
  }
});

// Delete hours (only by the user who created them or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const hourLog = await HourLog.findById(req.params.id);
    
    if (!hourLog) {
      return res.status(404).json({ error: 'Hour log not found' });
    }

    // Check if user can delete this hour log
    if (hourLog.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this hour log' });
    }

    await HourLog.findByIdAndDelete(req.params.id);

    res.json({ message: 'Hours deleted successfully' });
  } catch (error) {
    console.error('Error deleting hours:', error);
    res.status(500).json({ error: 'Failed to delete hours' });
  }
});

// Approve hours (admin only)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hourLog = await HourLog.findById(req.params.id);
    
    if (!hourLog) {
      return res.status(404).json({ error: 'Hour log not found' });
    }

    hourLog.approved = true;
    hourLog.approvedBy = req.user.id;
    await hourLog.save();

    await hourLog.populate('user', 'name email');
    await hourLog.populate('approvedBy', 'name');

    res.json({ 
      message: 'Hours approved successfully',
      data: hourLog 
    });
  } catch (error) {
    console.error('Error approving hours:', error);
    res.status(500).json({ error: 'Failed to approve hours' });
  }
});

// Get hours statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { timeRange = 'month' } = req.query;
    
    let startDate = new Date();
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const stats = await HourLog.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate },
          approved: true
        }
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' },
          totalEntries: { $sum: 1 },
          averageHours: { $avg: '$hours' }
        }
      }
    ]);

    const userStats = await HourLog.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate },
          approved: true
        }
      },
      {
        $group: {
          _id: '$user',
          totalHours: { $sum: '$hours' },
          entries: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userName: '$user.name',
          totalHours: 1,
          entries: 1
        }
      },
      {
        $sort: { totalHours: -1 }
      }
    ]);

    res.json({
      data: {
        overall: stats[0] || { totalHours: 0, totalEntries: 0, averageHours: 0 },
        byUser: userStats
      }
    });
  } catch (error) {
    console.error('Error fetching hour stats:', error);
    res.status(500).json({ error: 'Failed to fetch hour statistics' });
  }
});

module.exports = router; 