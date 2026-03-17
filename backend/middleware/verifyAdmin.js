const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    // Requires verifyToken to run first so req.user exists
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Access Denied: Not authenticated." });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Access Denied: You must be an Administrator. 🛑" });
    }

    next();
  } catch (err) {
    console.error("verifyAdmin Middleware Error:", err);
    res.status(500).json({ message: "Server error during authorization." });
  }
};

module.exports = verifyAdmin;
