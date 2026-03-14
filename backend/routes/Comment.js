const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const verifyToken = require('../middleware/verifyToken');
const contentFilter = require('../middleware/contentFilter');

// 1. ADD A NEW COMMENT
router.post('/add', verifyToken, contentFilter, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    const newComment = new Comment({
      content,
      post: postId, // Frontend se post ki ID aayegi
      author: req.user.id,
      parentComment: parentCommentId || null // Agar reply nahi hai toh default null
    });

    const savedComment = await newComment.save();
    
    // Create Notification for the Post Author
    const Post = require('../models/Post');
    const Notification = require('../models/Notification');
    const post = await Post.findById(postId);
    
    if (post && post.author.toString() !== req.user.id) {
      const newNotif = await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
        content: 'commented on your post'
      });
      await newNotif.populate('sender', 'username profilePic');
      await newNotif.populate('post', 'title');
      if (req.io) req.io.to(post.author.toString()).emit('new_notification', newNotif);
    }
    
    res.status(201).json({ 
      message: "Comment added successfully!", 
      comment: savedComment 
    });

  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// 2. GET ALL COMMENTS FOR A SPECIFIC POST
router.get('/post/:postId', async (req, res) => {
  try {
    // Kisi ek post ki ID se uske saare comments nikalna aur author ka naam populate karna
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
      
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

module.exports = router;