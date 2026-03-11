const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');
const auth = require('../middleware/verifyToken');
const upload = require('../middleware/upload'); // Multer middleware import kiya


router.get('/', async (req, res) => {
  try {
    const { sort = 'hot', page = 1, limit = 10 } = req.query; 

    // 1. Fetch posts from DB (without DB-level sorting initially so we can calculate Hot/Top)
    let posts = await Post.find({ isDeleted: { $ne: true } })
      .populate('author', 'username')
      .populate('community', 'name');

    // 2. Apply Sorting Logic in Memory
    if (sort === 'new') {
      posts.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'top') {
      posts.sort((a, b) => {
        const netA = (a.upvotes?.length || 0) - (a.downvotes?.length || 0);
        const netB = (b.upvotes?.length || 0) - (b.downvotes?.length || 0);
        return netB - netA;
      });
    } else {
      // Default: 'hot'
      // HackerNews-style algorithm: Score = (upvotes - downvotes) / (age_in_hours + 2)^1.5
      posts.sort((a, b) => {
        const scoreA = calculateHotScore(a);
        const scoreB = calculateHotScore(b);
        return scoreB - scoreA; // Descending
      });
    }
    // Apply Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedPosts = posts.slice(startIndex, endIndex);
    const hasMore = endIndex < posts.length;

    res.json({
      posts: paginatedPosts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(posts.length / limitNum)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Helper function for Hot Score
function calculateHotScore(post) {
  const upvotes = post.upvotes?.length || 0;
  const downvotes = post.downvotes?.length || 0;
  const netVotes = upvotes - downvotes;

  // If net votes are negative, treat as 0 to avoid punishing old negative posts 
  // more or less than new negative posts in a weird way, or base it strictly on votes.
  // For standard HN, score is (P) / (T+2)^G. We'll use absolute netVotes for magnitude 
  // and keep the sign.
  const s = netVotes > 0 ? 1 : netVotes < 0 ? -1 : 0;
  const magnitude = Math.abs(netVotes);

  const ageInMs = Date.now() - new Date(post.createdAt).getTime();
  const ageInHours = ageInMs / (1000 * 60 * 60);

  // Score = magnitude / (ageInHours + 2)^1.5. Multiply by sign to keep negative posts at bottom.
  const score = (magnitude / Math.pow(ageInHours + 2, 1.5)) * s;
  return score;
}

// GET POSTS BY COMMUNITY (ID OR NAME)
router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const { sort = 'hot', page = 1, limit = 10 } = req.query;
    let targetId = communityId;

    // If communityId is NOT a valid ObjectId, assume it's a name and find the actual ID
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      const Community = require('../models/Community');
      const community = await Community.findOne({ name: communityId });
      if (!community) return res.json([]); // Return empty if community not found
      targetId = community._id;
    }

    let posts = await Post.find({ community: targetId, isDeleted: { $ne: true } })
      .populate('author', 'username')
      .populate('community', 'name');

    // Apply Sorting Logic
    if (sort === 'new') {
      posts.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'top') {
      posts.sort((a, b) => {
        const netA = (a.upvotes?.length || 0) - (a.downvotes?.length || 0);
        const netB = (b.upvotes?.length || 0) - (b.downvotes?.length || 0);
        return netB - netA;
      });
    } else {
      // Default: 'hot'
      posts.sort((a, b) => {
        const scoreA = calculateHotScore(a);
        const scoreB = calculateHotScore(b);
        return scoreB - scoreA;
      });
    }

    // Apply Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedPosts = posts.slice(startIndex, endIndex);
    const hasMore = endIndex < posts.length;

    res.json({
      posts: paginatedPosts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(posts.length / limitNum)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// CREATE A NEW POST
router.post('/create', verifyToken, upload.array('media', 16), async (req, res) => {
  try {
    const { title, content, communityId, postType, link } = req.body;
    const media = [];

    // ... (media handling remains same)
    if (req.files && req.files.length > 0) {
      // ... (validation remains same)
      req.files.forEach(file => {
        const url = file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
        media.push({
          url,
          mimetype: file.mimetype
        });
      });
    }

    const newPost = new Post({
      title,
      content: content || "",
      media,
      community: communityId,
      author: req.user.id,
      postType: postType || 'text',
      link: link || ""
    });

    const savedPost = await newPost.save();

    // Populate post so the frontend receives full author details
    await savedPost.populate('author', 'username profilePic');
    await savedPost.populate('community', 'name');

    // Emit real-time event
    if (req.io) {
      req.io.emit('new_post', savedPost);
    }

    res.status(201).json({
      message: "Post created successfully!",
      post: savedPost
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// UPVOTE A POST
router.put('/:id/upvote', verifyToken, async (req, res) => {
  try {
    // 1. URL se post ki ID nikal kar database mein dhundo
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;

    // 2. Agar user ne pehle downvote kiya tha, toh usko hatao
    if (post.downvotes.includes(userId)) {
      post.downvotes.pull(userId);
    }

    // 3. Agar pehle se upvote kiya hai, toh upvote hatao (Toggle Off)
    if (post.upvotes.includes(userId)) {
      post.upvotes.pull(userId);
      await post.save();
      return res.status(200).json({ message: "Upvote removed", post });
    } 
    
    // 4. Agar upvote nahi kiya tha, toh upvote add karo (Toggle On)
    post.upvotes.push(userId);
    await post.save();
    
    // Create Notification (if not author)
    if (post.author.toString() !== userId) {
      const newNotif = await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'vote',
        post: post._id,
        content: 'upvoted your post'
      });
      // Emit to specific user
      if (req.io) {
        req.io.to(post.author.toString()).emit('new_notification', newNotif);
      }
    }
    
    if (req.io) req.io.emit('post_interaction', post._id);

    res.status(200).json({ message: "Post upvoted successfully", post });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DOWNVOTE A POST
router.put('/:id/downvote', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;

    // Agar pehle upvote kiya tha, toh usko hatao
    if (post.upvotes.includes(userId)) {
      post.upvotes.pull(userId);
    }

    // Agar pehle se downvote kiya hai, toh downvote hatao
    if (post.downvotes.includes(userId)) {
      post.downvotes.pull(userId);
      await post.save();
      return res.status(200).json({ message: "Downvote removed", post });
    } 
    
    // Warna downvote add karo
    post.downvotes.push(userId);
    await post.save();
    
    // Create Notification (if not author)
    if (post.author.toString() !== userId) {
      const newNotif = await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'vote',
        post: post._id,
        content: 'downvoted your post'
      });
      if (req.io) {
        req.io.to(post.author.toString()).emit('new_notification', newNotif);
      }
    }
    
    if (req.io) req.io.emit('post_interaction', post._id);

    res.status(200).json({ message: "Post downvoted successfully", post });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET ALL POSTS (For Homepage Feed)
// Dhyan de: Yahan humne verifyToken nahi lagaya hai, 
// kyunki feed koi bhi (bina login kiya user bhi) dekh sakta hai.
// Get single post by ID (Ye naya route add karna hai)
// GET SINGLE POST
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('community', 'name')
      // Ye waali nayi line add karni hai taaki comments ke andar ka username bhi aaye 👇
      .populate('comments.user', 'username'); 

    if (!post) {
      return res.status(404).json({ message: "Post nahi mili bhai!" });
    }
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});
// Add a comment to a post
router.post('/:id/comment', auth, async (req, res) => {
  try {
    // Note: Yahan hum maan rahe hain ki req.user mein logged-in user ki details hain 
    // (jo tumhare auth middleware se aati hai).
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post nahi mili!" });
    }

    const newComment = {
      text: req.body.text,
      user: req.user.id, // Auth middleware se user ID
      // Agar front-end se parentId aayi hai (matlab ye reply hai), toh usko save karo.
      // Nahi toh by default undefined/null rahega (matlab root comment hai)
      parentId: req.body.parentId || null
    };

    post.comments.push(newComment);
    await post.save();
    
    // Get the newly pushed comment (it's the last one)
    const savedComment = post.comments[post.comments.length - 1];

    // 1. Notify Post Author (if not the one commenting)
    let newRootNotif;
    if (post.author.toString() !== req.user.id) {
      newRootNotif = await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
        commentId: savedComment._id,
        content: 'commented on your post'
      });
      if (req.io) req.io.to(post.author.toString()).emit('new_notification', newRootNotif);
    }

    // 2. Notify Parent Comment Author (if this is a reply and not to self)
    if (req.body.parentId) {
      const parentComment = post.comments.id(req.body.parentId);
      if (parentComment && parentComment.user.toString() !== req.user.id) {
        const newReplyNotif = await Notification.create({
          recipient: parentComment.user,
          sender: req.user.id,
          type: 'comment',
          post: post._id,
          commentId: savedComment._id,
          content: 'replied to your comment'
        });
        if (req.io) req.io.to(parentComment.user.toString()).emit('new_notification', newReplyNotif);
      }
    }

    if (req.io) req.io.emit('post_interaction', post._id);

    res.json(post);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// EDIT A POST (Only text content/title for now)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('community');
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check ownership or Mod status
    const isAuthor = post.author.toString() === req.user.id;
    const isCreator = post.community && post.community.creator.toString() === req.user.id;
    const isMod = post.community && post.community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isAuthor && !isCreator && !isMod) {
      return res.status(403).json({ message: "You don't have permission to edit this post! 🛑" });
    }

    const { title, content, link } = req.body;
    if (title) post.title = title;
    if (content !== undefined) post.content = content;
    if (link !== undefined) post.link = link;

    await post.save();
    res.json({ message: "Post updated successfully! ✨", post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOFT DELETE A POST (User se gayab, backend mein safe!)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post nahi mili!" });
    }

    // Let's populate community to check creator and mods
    await post.populate('community');
    const community = post.community;
    
    // Check ownership or Mod status
    const isAuthor = post.author.toString() === req.user.id;
    const isCreator = community && community.creator.toString() === req.user.id;
    const isMod = community && community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isAuthor && !isCreator && !isMod) {
      return res.status(403).json({ message: "Tum sirf apni post delete kar sakte ho ya phir agar tum Mod ho! 🛑" });
    }

    // Soft delete — sirf flag lagao, DB se kuch mat hatao
    post.isDeleted = true;
    await post.save();

    res.json({ message: "Post deleted successfully! 🗑️" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- COMMENT VOTING ROUTES ---

// UPVOTE A COMMENT
router.put('/:postId/comment/:commentId/upvote', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const userId = req.user.id;

    // Remove downvote if exists
    if (comment.downvotes.includes(userId)) {
      comment.downvotes.pull(userId);
    }

    // Toggle upvote
    if (comment.upvotes.includes(userId)) {
      comment.upvotes.pull(userId);
    } else {
      comment.upvotes.push(userId);
    }

    await post.save();
    
    // Create Notification for Comment Author (if not self)
    if (comment.user.toString() !== userId && !comment.upvotes.includes(userId)) {
      // Note: We only notify if they JUST upvoted (not toggled off)
      // Since toggle happens above, we should check if they ARE in upvotes now
      if (comment.upvotes.includes(userId)) {
        await Notification.create({
          recipient: comment.user,
          sender: userId,
          type: 'vote',
          post: post._id,
          commentId: comment._id,
          content: 'upvoted your comment'
        });
      }
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DOWNVOTE A COMMENT
router.put('/:postId/comment/:commentId/downvote', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const userId = req.user.id;

    // Remove upvote if exists
    if (comment.upvotes.includes(userId)) {
      comment.upvotes.pull(userId);
    }

    // Toggle downvote
    if (comment.downvotes.includes(userId)) {
      comment.downvotes.pull(userId);
    } else {
      comment.downvotes.push(userId);
    }

    await post.save();

    // Create Notification for Comment Author (if not self)
    if (comment.user.toString() !== userId && comment.downvotes.includes(userId)) {
      await Notification.create({
        recipient: comment.user,
        sender: userId,
        type: 'vote',
        post: post._id,
        commentId: comment._id,
        content: 'downvoted your comment'
      });
    }
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT A COMMENT
router.put('/:postId/comment/:commentId', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Only author can edit
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own comments! 🛑" });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });

    comment.text = text;
    await post.save();

    res.json({ message: "Comment updated! ✨", post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE A COMMENT (Soft Delete)
router.delete('/:postId/comment/:commentId', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Check permissions: author, community creator, or mod
    await post.populate('community');
    const community = post.community;
    
    const isAuthor = comment.user.toString() === req.user.id;
    const isCreator = community && community.creator.toString() === req.user.id;
    const isMod = community && community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isAuthor && !isCreator && !isMod) {
      return res.status(403).json({ message: "Permission denied! 🛑" });
    }

    // Replace text and mark as deleted (optional: could remove from array, but tree might break if children exist)
    // Best practice for threaded: replace text with [deleted]
    comment.text = "[deleted]";
    // Optionally remove user ref if you don't want to show who it was
    comment.user = null; 

    await post.save();
    res.json({ message: "Comment deleted! 🗑️", post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SAVE / HIDE POST ROUTES ---

// SAVE/UNSAVE A POST
router.put('/:id/save', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!post || !user) return res.status(404).json({ message: "Post or User not found" });

    const userId = req.user.id;
    let isSaved = false;

    // Toggle logic in both User and Post models
    if (user.savedPosts.includes(post._id)) {
      user.savedPosts.pull(post._id);
      if (post.savedBy) post.savedBy.pull(userId);
    } else {
      user.savedPosts.push(post._id);
      if (post.savedBy) post.savedBy.push(userId);
      isSaved = true;
    }

    await Promise.all([user.save(), post.save()]);
    res.status(200).json({ message: isSaved ? "Post saved" : "Post unsaved", isSaved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HIDE/UNHIDE A POST
router.put('/:id/hide', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!post || !user) return res.status(404).json({ message: "Post or User not found" });

    const userId = req.user.id;
    let isHidden = false;

    // Toggle logic
    if (user.hiddenPosts.includes(post._id)) {
      user.hiddenPosts.pull(post._id);
      if (post.hiddenBy) post.hiddenBy.pull(userId);
    } else {
      user.hiddenPosts.push(post._id);
      if (post.hiddenBy) post.hiddenBy.push(userId);
      isHidden = true;
    }

    await Promise.all([user.save(), post.save()]);
    res.status(200).json({ message: isHidden ? "Post hidden" : "Post unhidden", isHidden });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;