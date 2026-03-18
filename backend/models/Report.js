const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetType: { 
    type: String, 
    enum: ['post', 'comment', 'community', 'user'], 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  reason: { 
    type: String, 
    enum: ['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation', 'other'],
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending' 
  }
}, { timestamps: true });

// Prevent duplicate reports from same user on same target
ReportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
