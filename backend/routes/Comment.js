const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const verifyToken = require('../middleware/verifyToken');
const contentFilter = require('../middleware/contentFilter');

// Note: We need Post and Notification models for creating notifications
const Post = require('../models/Post');
const Notification = require('../models/Notification');
// 1. ADD A NEW COMMENT
router.post('/add', verifyToken, contentFilter, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    // Feature flag / privilege check
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    const isReply = !!parentCommentId;

    if (user?.disabledFeatures?.includes(isReply ? 'reply' : 'comment')) {
      return res.status(403).json({ error: `Your ${isReply ? 'replying' : 'commenting'} privileges have been temporarily disabled by admins.` });
    }

    const Setting = require('../models/Setting');
    
    if (isReply) {
      const globalReplySetting = await Setting.findOne({ key: 'global_disable_reply' });
      if (globalReplySetting && globalReplySetting.value === 'true' && !user?.isAdmin) {
        return res.status(403).json({ error: "Replying is currently disabled platform-wide by admins." });
      }
    } else {
      const globalCommSetting = await Setting.findOne({ key: 'global_disable_comment' });
      if (globalCommSetting && globalCommSetting.value === 'true' && !user?.isAdmin) {
        return res.status(403).json({ error: "Commenting is currently disabled platform-wide by admins." });
      }
    }

    const newComment = new Comment({
      content,
      post: postId, // Frontend se post ki ID aayegi
      author: req.user.id,
      parentComment: parentCommentId || null // Agar reply nahi hai toh default null
    });

    const savedComment = await newComment.save();
    
    // Create Notification for the Post Author
    const post = await Post.findById(postId);
    
    if (post && post.author && post.author.toString() !== req.user.id) {
      const newNotif = await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id || postId,
        content: 'commented on your post'
      });
      await newNotif.populate('sender', 'username profilePic');
      await newNotif.populate('post', 'title');
      if (req.io) req.io.to(post.author.toString()).emit('new_notification', newNotif);
    }
    
    // 🔔 MENTION SYSTEM: Notify Tagged Users (@username)
    // Regex to match @username (letters, numbers, and underscores)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]); // sirf username nikalega bina @ ke
    }
    
    const uniqueMentions = [...new Set(mentions)]; // Duplicates hatane ke liye
    
    if (uniqueMentions.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: uniqueMentions } });
      
      for (const mUser of mentionedUsers) {
        // Khud ko mention karne par notification mat bhejo
        if (mUser && mUser._id && mUser._id.toString() !== req.user.id) {
          const mentionNotif = await Notification.create({
            recipient: mUser._id,
            sender: req.user.id,
            type: 'mention',
            post: post ? post._id : postId,
            content: 'mentioned you in a comment'
          });
          await mentionNotif.populate('sender', 'username profilePic');
          await mentionNotif.populate('post', 'title');
          if (req.io) req.io.to(mUser._id.toString()).emit('new_notification', mentionNotif);
        }
      }
    }

    // 💬 REPLY SYSTEM: Notify parent comment author if it's a reply
    if (parentCommentId) {
      const parentCommentDoc = await Comment.findById(parentCommentId);
      if (parentCommentDoc && parentCommentDoc.author && parentCommentDoc.author.toString() !== req.user.id) {
        const replyNotif = await Notification.create({
          recipient: parentCommentDoc.author,
          sender: req.user.id,
          type: 'reply',
          post: post ? post._id : postId,
          content: 'replied to your comment'
        });
        await replyNotif.populate('sender', 'username profilePic');
        await replyNotif.populate('post', 'title');
        if (req.io) req.io.to(parentCommentDoc.author.toString()).emit('new_notification', replyNotif);
      }
    }
    
    // Populate author details before sending back
    await savedComment.populate('author', 'username profilePic');


    res.status(201).json({ 
      message: "Comment added successfully!", 
      comment: savedComment 
    });

  } catch (err) {
    console.error("Comment Add Error:", err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// 2. GET ALL COMMENTS FOR A SPECIFIC POST
router.get('/post/:postId', async (req, res) => {
  try {
    // Kisi ek post ki ID se uske saare comments nikalna aur author ka naam populate karna
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username profilePic') // Also get profile pic
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// 3. EDIT A COMMENT
router.put('/:id', verifyToken, contentFilter, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Only author can edit
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only edit your own comments! 🛑" });
        }

        const { content } = req.body;
        if (!content) return res.status(400).json({ message: "Content is required" });

        comment.content = content;
        await comment.save();

        await comment.populate('author', 'username profilePic');

        res.json({ message: "Comment updated! ✨", comment });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// 4. DELETE A COMMENT (Soft Delete)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Check permissions: author, community creator, or mod
        const post = await Post.findById(comment.post).populate('community');
        const community = post.community;
        
        const isAuthor = comment.author.toString() === req.user.id;
        const isCreator = community && community.creator.toString() === req.user.id;
        const isMod = community && community.moderators?.some(modId => modId.toString() === req.user.id);

        if (!isAuthor && !isCreator && !isMod) {
            return res.status(403).json({ message: "Permission denied! 🛑" });
        }

        // Replace text and mark as deleted
        comment.content = "[deleted]";
        comment.author = null; // Anonymize

        await comment.save();
        res.json({ message: "Comment deleted! 🗑️", comment });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// 5. UPVOTE A COMMENT
router.put('/:id/upvote', verifyToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const userId = req.user.id;

        const User = require('../models/User');
        let anubhavChange = 0;

        // Toggle logic
        const hasUpvoted = comment.upvotes.includes(userId);
        const hasDownvoted = comment.downvotes.includes(userId);
        if (hasUpvoted) {
            comment.upvotes.pull(userId);
            anubhavChange = -1;
        } else {
            comment.upvotes.addToSet(userId);
            comment.downvotes.pull(userId);
            anubhavChange = hasDownvoted ? 2 : 1;
        }

        await comment.save();
        
        if (comment.author.toString() !== userId && anubhavChange !== 0) {
            await User.findByIdAndUpdate(comment.author, { $inc: { anubhav: anubhavChange } });
        }
        
        // TODO: Create Notification for Comment Author

        res.json({ message: "Vote updated", comment });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// 6. DOWNVOTE A COMMENT
router.put('/:id/downvote', verifyToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const userId = req.user.id;

        const User = require('../models/User');
        let anubhavChange = 0;

        // Toggle logic
        const hasDownvoted = comment.downvotes.includes(userId);
        const hasUpvoted = comment.upvotes.includes(userId);
        if (hasDownvoted) {
            comment.downvotes.pull(userId);
            anubhavChange = 1;
        } else {
            comment.downvotes.addToSet(userId);
            comment.upvotes.pull(userId);
            anubhavChange = hasUpvoted ? -2 : -1;
        }

        await comment.save();
        
        if (comment.author.toString() !== userId && anubhavChange !== 0) {
            await User.findByIdAndUpdate(comment.author, { $inc: { anubhav: anubhavChange } });
        }

        res.json({ message: "Vote updated", comment });
    } catch (err) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// 7. 🏆 ACCEPT BOUNTY (Bounty Award Route)
router.put('/:id/accept-bounty', verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const post = await Post.findById(comment.post);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Sirf post author hi answer accept kar sakta hai
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the post author can award the bounty!" });
    }

    // Check agar bounty already resolved hai
    if (post.bountyResolved) {
      return res.status(400).json({ message: "Bounty is already resolved! 🛑" });
    }

    // Khud ke comment ko accept nahi kar sakte
    if (comment.author.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot accept your own comment for a bounty!" });
    }

    // Transfer points
    const User = require('../models/User');
    const commentAuthor = await User.findById(comment.author);
    if (commentAuthor && post.bountyAmount > 0) {
      commentAuthor.anubhav += post.bountyAmount;
      await commentAuthor.save();
    }

    // Update states
    post.bountyResolved = true;
    comment.isAccepted = true;
    await post.save();
    await comment.save();

    // Emit notification to winner
    if (req.io) {
      req.io.to(comment.author.toString()).emit('new_notification', { content: `awarded you a bounty of ${post.bountyAmount} Anubhav! 🏆` });
      req.io.emit('post_interaction', post._id);
    }

    res.status(200).json({ message: "Bounty awarded successfully! 🏆", comment });
  } catch (err) {
    console.error('Bounty error:', err);
    res.status(500).json({ error: 'Failed to award bounty.' });
  }
});

module.exports = router;