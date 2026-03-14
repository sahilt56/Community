const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Cookie se token nikalna, ya fallback ke roop me header se
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    if (req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]; 
    } else {
      token = req.headers.authorization;
    }
  }

  if (token) {
    // 2. Token ko apni secret key se verify karna
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({ message: "Token is not valid or has expired! Please login again." });
      }
      
      // 3. Agar token ekdum sahi hai, toh user ki details request mein save karke aage jane do
      req.user = user;
      next(); 
    });
  } else {
    return res.status(401).json({ message: "You are not authenticated! No token provided." });
  }
};

module.exports = verifyToken;