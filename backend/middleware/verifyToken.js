const jwt = require('jsonwebtoken');
const BlacklistToken = require('../models/BlacklistToken');
const User = require('../models/User');

// 🚀 In-memory cache for blacklisted tokens (to avoid DB hits on every request)
// This gets cleared every time a token is added/removed from blacklist
const blacklistCache = new Map();

// Export for backend use
const invalidateBlacklistCache = () => {
  blacklistCache.clear();
};

const verifyToken = async (req, res, next) => {
  try {
    // 1. Authorization header ko PEHLE check karo (always freshest token from frontend)
    // Cookie ko FALLBACK ke roop me use karo (kyunki cookies stale ho sakti hain after logout)
    let token = null;

    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1]; 
      } else {
        token = req.headers.authorization;
      }
    }

    // Fallback to cookie only if no Authorization header
    if (!token) {
      token = req.cookies?.token;
    }

    if (!token) {
      return res.status(401).json({ message: "You are not authenticated! No token provided." });
    }

    // 2. Token ko blacklist me check karna (with caching to avoid DB hits)
    // Cache hit: instant return
    if (blacklistCache.has(token)) {
      return res.status(401).json({ message: "Session has been invalidated. Please log in again.", code: "TOKEN_BLACKLISTED" });
    }

    // Cache miss: check DB once, then cache the result
    // Note: We only cache "IS blacklisted" to avoid false data. Non-blacklisted tokens expire naturally.
    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) {
      blacklistCache.set(token, true);
      return res.status(401).json({ message: "Session has been invalidated. Please log in again.", code: "TOKEN_BLACKLISTED" });
    }

    // 3. Token ko apni secret key se verify karna
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          // 🛡️ Frontend ko batane ke liye ki token refresh karna hai
          return res.status(401).json({ message: "Token has expired! Please refresh.", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ message: "Token is not valid! Please log in again.", code: "TOKEN_INVALID" });
      }
      
      try {
        const userDoc = await User.findById(user.id);
        if (!userDoc) {
          return res.status(401).json({ message: "User not found! Please log in again.", code: "USER_NOT_FOUND" });
        }
        if (userDoc.isBanned) {
          return res.status(403).json({ message: "Your account has been temporarily or permanently banned.", code: "USER_BANNED" });
        }
        
        // 4. Agar token ekdum sahi hai, toh user ki details request mein save karke aage jane do
        req.user = user;
        next(); 
      } catch (dbErr) {
        return res.status(500).json({ message: "Internal server error connecting to DB." });
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error during authentication." });
  }
};

module.exports = verifyToken;
module.exports.invalidateBlacklistCache = invalidateBlacklistCache;