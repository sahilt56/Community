const jwt = require('jsonwebtoken');
const BlacklistToken = require('../models/BlacklistToken');

const verifyToken = async (req, res, next) => {
  try {
    // 1. Cookie se token nikalna, ya fallback ke roop me header se
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1]; 
      } else {
        token = req.headers.authorization;
      }
    }

    if (!token) {
      return res.status(401).json({ message: "You are not authenticated! No token provided." });
    }

    // 2. Token ko blacklist me check karna
    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ message: "Session has been invalidated. Please log in again.", code: "TOKEN_BLACKLISTED" });
    }

    // 3. Token ko apni secret key se verify karna
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          // 🛡️ Frontend ko batane ke liye ki token refresh karna hai
          return res.status(401).json({ message: "Token has expired! Please refresh.", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ message: "Token is not valid! Please log in again.", code: "TOKEN_INVALID" });
      }
      
      // 4. Agar token ekdum sahi hai, toh user ki details request mein save karke aage jane do
      req.user = user;
      next(); 
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error during authentication." });
  }
};

module.exports = verifyToken;