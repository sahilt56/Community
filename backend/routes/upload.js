const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');

// POST /api/upload
// Standalone endpoint to upload a single file (image or video)
router.post('/', verifyToken, upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided." });
    }

    const file = req.file;
    
    // Safely check for Cloudinary path/secure_url OR fallback to empty string
    const fileUrl = file.path || file.secure_url || ""; 
    
    // Determine the URL depending on local disk (uses filename) or Cloudinary
    const url = fileUrl.startsWith('http') ? fileUrl : `/uploads/${file.filename}`;
    const mimetype = file.mimetype;

    res.status(200).json({ url, mimetype });
  } catch (error) {
    console.error("Upload route error:", error);
    // Send specific error message sent by Multer FileFilter
    res.status(500).json({ 
      message: error.message || "File upload failed.",
      error: error
    });
  }
});

module.exports = router;
