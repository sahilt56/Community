const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: "" }, // Markdown text for 'text' type
  postType: { type: String, enum: ['text', 'link', 'media'], default: 'text' },
  link: { type: String }, // External URL for 'link' type
  media: [
    {
      url: { type: String, required: true },
      mimetype: { type: String, required: true }
    }
  ], // Array to support multiple images/videos
  
  // Soft Delete Flag — post frontend se gayab ho jayegi lekin DB mein rahegi
  isDeleted: { type: Boolean, default: false },

  // Post kisne likha hai (User ID)
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Post kis community mein daala gaya hai (Community ID)
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  
  // Vote system (Kin users ne upvote ya downvote kiya unki ID ki list)
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Null = root comment, otherwise it's a reply to this ID
      upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);