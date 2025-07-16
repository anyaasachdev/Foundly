const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  joinCode: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalMembers: { type: Number, default: 1 },
  totalHours: { type: Number, default: 0 },
  activeProjects: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', organizationSchema);