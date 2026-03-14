const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  
  // Jis user ne comment kiya hai
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Jis post par comment kiya hai
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  
  // Yeh jaadu wali line hai! Agar koi directly post pe comment karega toh yeh null hoga. 
  // Lekin agar koi kisi aur ke comment ka "Reply" dega, toh yahan us original comment ki ID aayegi.
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
  
}, { timestamps: true });

// 🚀 Performance Optimizations: Indexes for Large Scale
CommentSchema.index({ post: 1, createdAt: -1 }); // Fast loading of comments for a specific post (sorted by newest)
CommentSchema.index({ parentComment: 1 }); // Fast lookup for child replies
CommentSchema.index({ author: 1 }); // Fast loading of a user's comment history

module.exports = mongoose.model('Comment', CommentSchema);