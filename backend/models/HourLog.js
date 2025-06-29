const mongoose = require('mongoose');

const hourLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  hours: {
    type: Number,
    required: true,
    min: 0.1,
    max: 24
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    enum: ['volunteer', 'training', 'meeting', 'event', 'admin', 'other'],
    default: 'volunteer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HourLog', hourLogSchema);