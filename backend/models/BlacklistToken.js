const mongoose = require('mongoose');

const BlacklistTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  // Ye date batayegi ki token asal me kab expire hoga
  expiresAt: { type: Date, required: true }
});

// 🧹 MongoDB TTL Index: Jaise hi 'expiresAt' ka time aayega, yeh document automatically DB se delete ho jayega!
// (Kyunki expired token ko blacklist me rakhne ka koi fayda nahi)
BlacklistTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🚀 PERFORMANCE INDEX: Token field pe index taaki findOne({ token }) fast rahe!
// Yeh sab logout/refresh requests ko 30 sec delay se bachayega
BlacklistTokenSchema.index({ token: 1 });

module.exports = mongoose.model('BlacklistToken', BlacklistTokenSchema);