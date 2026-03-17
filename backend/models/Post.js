const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: "" }, // Markdown text for 'text' type
  postType: { type: String, enum: ['text', 'link', 'media', 'poll'], default: 'text' },
  link: { type: String }, // External URL for 'link' type
  media: [
    {
      url: { type: String, required: true },
      mimetype: { type: String, required: true }
    }
  ], // Array to support multiple images/videos
  pollOptions: [
    {
      option: { type: String, required: true },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
  ],
  pollEndsAt: { type: Date },
  
  // Soft Delete Flag — post frontend se gayab ho jayegi lekin DB mein rahegi
  isDeleted: { type: Boolean, default: false },

  // 🔥 Hot Score for sorting performance
  hotScore: { type: Number, default: 0, index: -1 }, // Descending index for fast sorting

  // Post kisne likha hai (User ID)
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorHasVartalapBadge: { type: Boolean, default: false },
  
  // Post kis community mein daala gaya hai (Community ID)
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  
  // Vote system (Kin users ne upvote ya downvote kiya unki ID ki list)
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);