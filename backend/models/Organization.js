const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  location: String,
  website: String,
  category: {
    type: String,
    enum: ['community', 'environment', 'education', 'health', 'arts', 'technology'],
    default: 'community'
  },
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
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verified: {
    type: Boolean,
    default: false
  },
  stats: {
    totalMembers: { type: Number, default: 0 },
    activeProjects: { type: Number, default: 0 },
    totalImpact: { type: Number, default: 0 },
    monthlyGrowth: { type: Number, default: 0 }
  },
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#e91e63' },
    secondaryColor: { type: String, default: '#4caf50' },
    theme: { type: String, default: 'light' }
  },
  features: {
    messaging: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    calendar: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', organizationSchema);