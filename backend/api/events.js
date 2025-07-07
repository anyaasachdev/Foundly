const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Get all events for the current user's organization
router.get('/', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { startDate, endDate, type } = req.query;
    
    let query = { organization: organizationId };
    
    // Filter by date range if provided
    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Filter by type if provided
    if (type && type !== 'all') {
      query.type = type;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ startDate: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
router.post('/', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      startTime, 
      endTime, 
      type, 
      location, 
      attendees, 
      reminder, 
      recurring, 
      color 
    } = req.body;

    if (!title || !startDate || !startTime) {
      return res.status(400).json({ error: 'Title, start date, and start time are required' });
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : startDateTime;

    const event = new Event({
      title,
      description,
      organization: organizationId,
      createdBy: req.user.id,
      startDate: startDateTime,
      endDate: endDateTime,
      type: type || 'meeting',
      location: location || '',
      attendees: attendees ? attendees.map(email => ({ user: email, status: 'pending' })) : [],
      reminder: reminder || 15,
      recurring: recurring || 'none',
      color: color || '#667eea'
    });

    await event.save();

    // Populate user info for response
    await event.populate('createdBy', 'name email');

    res.status(201).json({ 
      message: 'Event created successfully',
      data: event 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user can edit this event
    if (event.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      startTime, 
      endTime, 
      type, 
      location, 
      attendees, 
      reminder, 
      recurring, 
      color 
    } = req.body;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (startDate !== undefined && startTime !== undefined) {
      event.startDate = new Date(`${startDate}T${startTime}`);
    }
    if (endDate !== undefined && endTime !== undefined) {
      event.endDate = new Date(`${endDate}T${endTime}`);
    }
    if (type !== undefined) event.type = type;
    if (location !== undefined) event.location = location;
    if (attendees !== undefined) {
      event.attendees = attendees.map(email => ({ user: email, status: 'pending' }));
    }
    if (reminder !== undefined) event.reminder = reminder;
    if (recurring !== undefined) event.recurring = recurring;
    if (color !== undefined) event.color = color;

    await event.save();
    await event.populate('createdBy', 'name email');

    res.json({ 
      message: 'Event updated successfully',
      data: event 
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user can delete this event
    if (event.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Respond to event invitation
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'declined'
    
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "declined"' });
    }

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Find and update the user's attendance status
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user.id
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({ error: 'You are not invited to this event' });
    }

    event.attendees[attendeeIndex].status = status;
    await event.save();

    await event.populate('createdBy', 'name email');
    await event.populate('attendees.user', 'name email');

    res.json({ 
      message: `Event ${status} successfully`,
      data: event 
    });
  } catch (error) {
    console.error('Error responding to event:', error);
    res.status(500).json({ error: 'Failed to respond to event' });
  }
});

// Get upcoming events
router.get('/upcoming', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { limit = 10 } = req.query;
    const now = new Date();

    const events = await Event.find({
      organization: organizationId,
      startDate: { $gte: now }
    })
      .populate('createdBy', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ startDate: 1 })
      .limit(parseInt(limit));

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get events for a specific date range
router.get('/range', auth, async (req, res) => {
  try {
    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({ error: 'No organization selected' });
    }

    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const events = await Event.find({
      organization: organizationId,
      startDate: { $gte: new Date(start), $lte: new Date(end) }
    })
      .populate('createdBy', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ startDate: 1 });

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching events by range:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router; 