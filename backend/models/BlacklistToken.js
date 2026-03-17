const mongoose = require('mongoose');

const BlacklistTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  // Ye date batayegi ki token asal me kab expire hoga
  expiresAt: { type: Date, required: true }
});

// 🧹 MongoDB TTL Index: Jaise hi 'expiresAt' ka time aayega, yeh document automatically DB se delete ho jayega!
// (Kyunki expired token ko blacklist me rakhne ka koi fayda nahi)
BlacklistTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BlacklistToken', BlacklistTokenSchema);