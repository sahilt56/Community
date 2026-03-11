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

module.exports = mongoose.model('Comment', CommentSchema);