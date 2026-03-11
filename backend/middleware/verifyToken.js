const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Request ke header se token nikalna
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Handling case where token might be just the token string or "Bearer <token>"
    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1]; 
    } else {
      token = authHeader; // Assume the whole string is the token
    }

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