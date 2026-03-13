const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        // Only allow letters, numbers, and underscores, between 3-20 characters
        return /^[a-zA-Z0-9_]{3,20}$/.test(v);
      },
      message: props => `${props.value} is not a valid username. Use 3-20 characters (letters, numbers, and underscores only)!`
    }
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  anubhav: { type: Number, default: 0 }, // Reddit ka upvote/downvote score
  profilePic: { type: String, default: '' },
  bannerPic: { type: String, default: '' },
  description: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  hiddenPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
}, { timestamps: true });

// Password ko database mein save hone se pehle encrypt (hash) karna
// Password ko database mein save hone se pehle encrypt (hash) karna
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);