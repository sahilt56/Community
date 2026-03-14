const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');
const contentFilter = require('../middleware/contentFilter');


router.get('/', async (req, res) => {
  try {
    const { sort = 'hot', page = 1, limit = 10 } = req.query; 

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10)); // Prevent DoS: Cap at 50
    const startIndex = (pageNum - 1) * limitNum;

    let posts = [];
    let totalDocs = 0;

    if (sort === 'new') {
      // OPTIMIZED: Database level sorting and pagination
      // This is much faster and cleaner for memory
      totalDocs = await Post.countDocuments({ isDeleted: { $ne: true } });
      posts = await Post.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .populate('author', 'username')
        .populate('community', 'name');
    } else {
      // OPTIMIZED: Database level sorting for 'top' and 'hot' using Aggregation Pipeline
      const matchQuery = { isDeleted: { $ne: true } };
      totalDocs = await Post.countDocuments(matchQuery);

      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            netVotes: {
              $subtract: [
                { $size: { $ifNull: ["$upvotes", []] } },
                { $size: { $ifNull: ["$downvotes", []] } }
              ]
            }
          }
        }
      ];

      if (sort === 'top') {
        pipeline.push({ $sort: { netVotes: -1, createdAt: -1 } });
      } else {
        // Default: 'hot'
        pipeline.push(
          {
            $addFields: {
              ageInHours: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }
            }
          },
          {
            $addFields: {
              magnitude: { $abs: "$netVotes" },
              s: { $cond: [ { $gt: ["$netVotes", 0] }, 1, { $cond: [ { $lt: ["$netVotes", 0] }, -1, 0 ] } ] },
              ageFactor: { $pow: [{ $add: ["$ageInHours", 2] }, 1.5] }
            }
          },
          {
            $addFields: { hotScore: { $multiply: [{ $divide: ["$magnitude", "$ageFactor"] }, "$s"] } }
          },
          { $sort: { hotScore: -1, createdAt: -1 } }
        );
      }

      pipeline.push({ $skip: startIndex }, { $limit: limitNum });
      const aggregatedPosts = await Post.aggregate(pipeline);
      
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username' },
        { path: 'community', select: 'name' }
      ]);
    }

    /* REMOVED OLD BLOCK
    // 1. Fetch posts from DB...
    // 2. Apply Sorting Logic in Memory...
    if (sort === 'new') { ... } else if (sort === 'top') { ... }
    */
/*
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
*/
    
    // For 'new' sort, we use optimized query. For others, we use slice results.
    const hasMore = startIndex + limitNum < totalDocs;

    res.json({
      posts: posts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(totalDocs / limitNum)
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
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10)); // Prevent DoS
    const startIndex = (pageNum - 1) * limitNum;
    let targetId = communityId;

    // If communityId is NOT a valid ObjectId, assume it's a name and find the actual ID
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      const Community = require('../models/Community');
      const community = await Community.findOne({ name: communityId });
      if (!community) return res.json([]); // Return empty if community not found
      targetId = community._id;
    }

    let posts = [];
    let totalDocs = 0;

    if (sort === 'new') {
      // OPTIMIZED: Database level sorting for 'new'
      totalDocs = await Post.countDocuments({ community: targetId, isDeleted: { $ne: true } });
      posts = await Post.find({ community: targetId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limitNum)
        .populate('author', 'username')
        .populate('community', 'name');
    } else {
      // OPTIMIZED: Database level sorting for 'top' and 'hot' using Aggregation Pipeline
      const matchQuery = { community: targetId, isDeleted: { $ne: true } };
      totalDocs = await Post.countDocuments(matchQuery);

      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            netVotes: {
              $subtract: [
                { $size: { $ifNull: ["$upvotes", []] } },
                { $size: { $ifNull: ["$downvotes", []] } }
              ]
            }
          }
        }
      ];

      if (sort === 'top') {
        pipeline.push({ $sort: { netVotes: -1, createdAt: -1 } });
      } else {
        // Default: 'hot'
        pipeline.push(
          {
            $addFields: {
              ageInHours: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }
            }
          },
          {
            $addFields: {
              magnitude: { $abs: "$netVotes" },
              s: { $cond: [ { $gt: ["$netVotes", 0] }, 1, { $cond: [ { $lt: ["$netVotes", 0] }, -1, 0 ] } ] },
              ageFactor: { $pow: [{ $add: ["$ageInHours", 2] }, 1.5] }
            }
          },
          {
            $addFields: { hotScore: { $multiply: [{ $divide: ["$magnitude", "$ageFactor"] }, "$s"] } }
          },
          { $sort: { hotScore: -1, createdAt: -1 } }
        );
      }

      pipeline.push({ $skip: startIndex }, { $limit: limitNum });
      const aggregatedPosts = await Post.aggregate(pipeline);
      
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username' },
        { path: 'community', select: 'name' }
      ]);
    }

    const hasMore = startIndex + limitNum < totalDocs;

    res.json({
      posts: posts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(totalDocs / limitNum)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// CREATE A NEW POST
router.post('/create', verifyToken, upload.array('media', 16), contentFilter, async (req, res) => {
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
    console.error('Post creation error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});
// UPVOTE A POST
router.put('/:id/upvote', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postCheck = await Post.findById(req.params.id);
    if (!postCheck) return res.status(404).json({ message: "Post not found" });

    const hasUpvoted = postCheck.upvotes.includes(userId);
    let update = {};

    if (hasUpvoted) {
      // Toggle off: Remove from upvotes
      update = { $pull: { upvotes: userId } };
    } else {
      // Toggle on: Add to upvotes, Remove from downvotes
      update = { 
        $addToSet: { upvotes: userId },
        $pull: { downvotes: userId }
      };
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    // Create Notification (if not already upvoted by this user before)
    // Note: Since we use findByIdAndUpdate, we check if user was already in upvotes list
    // But for simplicity and to avoid race conditions, we'll just check if the author is different
    if (post.author.toString() !== userId) {
      // Check if notification already exists to avoid spamming
      const existingNotif = await Notification.findOne({
        recipient: post.author,
        sender: userId,
        type: 'vote',
        post: post._id
      });

      if (!existingNotif) {
        const newNotif = await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'vote',
          post: post._id,
          content: 'upvoted your post'
        });
        await newNotif.populate('sender', 'username profilePic');
        await newNotif.populate('post', 'title');
        if (req.io) req.io.to(post.author.toString()).emit('new_notification', newNotif);
      }
    }
    
    if (req.io) req.io.emit('post_interaction', post._id);
    res.status(200).json({ message: "Post upvoted successfully", post });

  } catch (err) {
    console.error('Upvote error:', err);
    res.status(500).json({ error: 'Voting failed.' });
  }
});

// DOWNVOTE A POST
router.put('/:id/downvote', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postCheck = await Post.findById(req.params.id);
    if (!postCheck) return res.status(404).json({ message: "Post not found" });

    const hasDownvoted = postCheck.downvotes.includes(userId);
    let update = {};

    if (hasDownvoted) {
      // Toggle off: Remove from downvotes
      update = { $pull: { downvotes: userId } };
    } else {
      // Toggle on: Add to downvotes, Remove from upvotes
      update = { 
        $addToSet: { downvotes: userId },
        $pull: { upvotes: userId }
      };
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (post.author.toString() !== userId) {
      const existingNotif = await Notification.findOne({
        recipient: post.author,
        sender: userId,
        type: 'vote',
        post: post._id,
        content: 'downvoted your post'
      });

      if (!existingNotif) {
        const newNotif = await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'vote',
          post: post._id,
          content: 'downvoted your post'
        });
        await newNotif.populate('sender', 'username profilePic');
        await newNotif.populate('post', 'title');
        if (req.io) req.io.to(post.author.toString()).emit('new_notification', newNotif);
      }
    }
    
    if (req.io) req.io.emit('post_interaction', post._id);
    res.status(200).json({ message: "Post downvoted successfully", post });

  } catch (err) {
    console.error('Downvote error:', err);
    res.status(500).json({ error: 'Voting failed.' });
  }
});
// GET ALL POSTS (For Homepage Feed)
// Dhyan de: Yahan humne verifyToken nahi lagaya hai, 
// kyunki feed koi bhi (bina login kiya user bhi) dekh sakta hai.
// Get single post by ID (Ye naya route add karna hai)
// GET SINGLE POST
router.get('/:id', async (req, res) => {
  try {
    // 1. Invalid ID format check (Prevents Server 500 CastError crash)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid Post ID format!" });
    }

    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('community', 'name')
      // Ye waali nayi line add karni hai taaki comments ke andar ka username bhi aaye 👇
      .populate('comments.user', 'username'); 

    // 2. Soft-deleted post check (Security Leak Fix)
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post nahi mili bhai!" });
    }
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});
// Add a comment to a post
router.post('/:id/comment', verifyToken, contentFilter, async (req, res) => {
  try {
    // Note: Yahan hum maan rahe hain ki req.user mein logged-in user ki details hain 
    // (jo tumhare auth middleware se aati hai).
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post nahi mili!" });
    }

    if (req.body.parentId) {
      const parentComment = post.comments.id(req.body.parentId);
      if (!parentComment) return res.status(400).json({ message: "Parent comment does not exist." });
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
      await newRootNotif.populate('sender', 'username profilePic');
      await newRootNotif.populate('post', 'title');
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
        await newReplyNotif.populate('sender', 'username profilePic');
        await newReplyNotif.populate('post', 'title');
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
router.put('/:id', verifyToken, contentFilter, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('community');
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check ownership
    const isAuthor = post.author.toString() === req.user.id;

    if (!isAuthor) {
      return res.status(403).json({ message: "Only the author can edit this post! 🛑" });
    }

    const { title, content, link } = req.body;
    if (title) post.title = title;
    if (content !== undefined) post.content = content;
    if (link !== undefined) post.link = link;

    await post.save();
    res.json({ message: "Post updated successfully! ✨", post });
  } catch (err) {
    console.error('Post edit error:', err);
    res.status(500).json({ error: 'Failed to update post.' });
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
    res.status(500).json({ error: 'Failed to delete post.' });
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
        // Note: Not capturing return value in a var to populate, but if you need RT update for comments too:
        // const notif = await Notification.create({...}); await notif.populate(...); req.io.emit(...)
      }
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
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
       // Logic same as above - ensure you populate if emitting
    }
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// EDIT A COMMENT
router.put('/:postId/comment/:commentId', verifyToken, contentFilter, async (req, res) => {
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
    res.status(500).json({ error: 'An error occurred. Please try again.' });
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
    res.status(500).json({ error: 'An error occurred. Please try again.' });
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
    res.status(500).json({ error: 'An error occurred. Please try again.' });
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
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

module.exports = router;