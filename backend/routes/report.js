const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const verifyToken = require('../middleware/verifyToken');

// SUBMIT A REPORT
router.post('/', verifyToken, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'targetType, targetId, and reason are required.' });
    }

    // Restriction: Cannot report your own content
    if (targetType === 'post') {
      const Post = require('../models/Post');
      const post = await Post.findById(targetId);
      if (post && post.author.toString() === req.user.id) {
        return res.status(400).json({ message: "You cannot report your own post! 🛑" });
      }
    } else if (targetType === 'community') {
      const Community = require('../models/Community');
      const community = await Community.findById(targetId);
      if (community && community.creator.toString() === req.user.id) {
        return res.status(400).json({ message: "You cannot report your own community! 🛑" });
      }
    }
    // Check if this user already reported this content
    const existingReport = await Report.findOne({ 
      reporter: req.user.id, 
      targetType, 
      targetId 
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this content.' });
    }

    const newReport = new Report({
      reporter: req.user.id,
      targetType,
      targetId,
      reason,
      description: description || ''
    });

    const savedReport = await newReport.save();

    // Notify all Admins
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const admins = await User.find({ isAdmin: true }).select('_id');
    
    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        sender: req.user.id,
        type: 'report',
        reportId: savedReport._id,
        content: `reported a ${targetType}`
      }));
      await Notification.insertMany(notifications);
      
      // Also emit via socket if available
      if (req.io) {
          admins.forEach(admin => {
              req.io.to(admin._id.toString()).emit('new_notification');
          });
      }
    }

    res.status(201).json({ message: 'Report submitted successfully. Our team will review it. 🛡️' });

  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// GET ALL REPORTS (for admin/future moderation panel)
router.get('/', verifyToken, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(reports);
  } catch (err) {
    console.error('Fetch reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

module.exports = router;
