const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['meeting', 'deadline', 'milestone', 'review', 'training', 'social', 'personal'],
    default: 'meeting'
  },
  location: String,
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
  }],
  reminder: {
    type: Number, // minutes before event
    default: 15
  },
  recurring: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  color: {
    type: String,
    default: '#667eea'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);