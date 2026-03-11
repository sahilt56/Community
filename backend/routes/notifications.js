const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');

// GET all notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profilePic')
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id, 
      read: false 
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK specific notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK ALL as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
