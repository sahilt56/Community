const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }, // jaise "programming" ya "ai-tech"
  description: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // subscribers ko members bolenge
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // extra mods
  minAnubhav: { type: Number, default: 0 },
  minAgeDays: { type: Number, default: 0 },
  profilePic: { type: String, default: "" },
  bannerPic: { type: String, default: "" },
  topic: { type: String, default: "General" },
  rules: [{
    title: { type: String, required: true },
    description: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Community', CommunitySchema);