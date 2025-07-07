const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['general', 'urgent', 'event', 'update'],
    default: 'general'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'admins', 'moderators', 'members'],
    default: 'all'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationSent: {
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);