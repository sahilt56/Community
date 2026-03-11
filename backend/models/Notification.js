const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['vote', 'comment', 'follow'], 
    required: true 
  },
  post: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Post' 
  },
  commentId: {
    type: String // To link to a specific comment if needed
  },
  content: {
    type: String // Optional: summary of notice
  },
  read: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
