const mongoose = require('mongoose');

const VoiceRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VoiceRoom', VoiceRoomSchema);
