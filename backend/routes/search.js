const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Community = require('../models/Community');

// SEARCH: Communities + Users
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ communities: [], users: [] });
    }
    //fix

    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    // Search communities by name
    const communities = await Community.find({ name: regex, isBanned: { $ne: true }, isHidden: { $ne: true } })
      .select('name description members profilePic authorHasVartalapBadge')
      .sort({ authorHasVartalapBadge: -1, members: -1 })
      .limit(5);

    // Search users by username, excluding admins
    const users = await User.find({ username: regex, isAdmin: { $ne: true } })
      .select('username profilePic hasVartalapBadge')
      .sort({ hasVartalapBadge: -1, anubhav: -1 })
      .limit(5);

    // Search posts by title or content (excluding deleted posts)
    const Post = require('../models/Post');
    const posts = await Post.find({
      $or: [
        { title: regex },
        { content: regex }
      ],
      isDeleted: { $ne: true }
    })
      .select('title community author authorHasVartalapBadge')
      .populate('community', 'name')
      .populate('author', 'username')
      .sort({ authorHasVartalapBadge: -1, createdAt: -1 })
      .limit(5);

    res.json({ communities, users, posts });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

module.exports = router;
