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

    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    // Search communities by name
    const communities = await Community.find({ name: regex })
      .select('name description members')
      .limit(5);

    // Search users by username
    const users = await User.find({ username: regex })
      .select('username profilePic')
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
      .select('title community author')
      .populate('community', 'name')
      .populate('author', 'username')
      .limit(5);

    res.json({ communities, users, posts });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

module.exports = router;
