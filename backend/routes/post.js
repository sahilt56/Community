const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');
const contentFilter = require('../middleware/contentFilter');
const redisClient = require('../utils/redisClient');


router.get('/', async (req, res) => {
  try {
    // ⚡ Caching: Create a unique key for this specific request
    const cacheKey = `posts:${JSON.stringify(req.query)}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const { sort = 'hot', page = 1, limit = 10 } = req.query; 

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10)); // Prevent DoS: Cap at 50
    const startIndex = (pageNum - 1) * limitNum;

    let posts = [];
    let totalDocs = 0;

    const matchQuery = { isDeleted: { $ne: true } };
    totalDocs = await Post.countDocuments(matchQuery);

    if (sort === 'new') {
      const pipeline = [
        { $match: matchQuery },
        { $sort: { authorHasVartalapBadge: -1, createdAt: -1 } },
        { $skip: startIndex },
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      const aggregatedPosts = await Post.aggregate(pipeline);
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    } else if (sort === 'hot') {
      const pipeline = [
        { $match: matchQuery },
        { $sort: { authorHasVartalapBadge: -1, hotScore: -1, createdAt: -1 } },
        { $skip: startIndex },
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      const aggregatedPosts = await Post.aggregate(pipeline);
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    } else {
      // 'top' sort using Aggregation Pipeline for netVotes
      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            netVotes: { $subtract: [ { $size: { $ifNull: ["$upvotes", []] } }, { $size: { $ifNull: ["$downvotes", []] } } ] }
          }
        },
        { $sort: { authorHasVartalapBadge: -1, netVotes: -1, createdAt: -1 } },
        { $skip: startIndex }, 
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      
      const aggregatedPosts = await Post.aggregate(pipeline);
      
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    }
    
    // For 'new' sort, we use optimized query. For others, we use slice results.
    const hasMore = startIndex + limitNum < totalDocs;

    const responseData = {
      posts: posts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(totalDocs / limitNum)
    };

    // ⚡ Caching: Store the result in Redis for 5 minutes (300 seconds)
    // Feeds change frequently, so a short TTL is good.
    await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

    res.json(responseData);
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
    // ⚡ Caching: Create a unique key for this specific request
    const cacheKey = `posts:community:${req.params.communityId}:${JSON.stringify(req.query)}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

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

    const matchQuery = { community: targetId, isDeleted: { $ne: true } };
    totalDocs = await Post.countDocuments(matchQuery);

    if (sort === 'new') {
      const pipeline = [
        { $match: matchQuery },
        { $sort: { authorHasVartalapBadge: -1, createdAt: -1 } },
        { $skip: startIndex },
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      const aggregatedPosts = await Post.aggregate(pipeline);
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    } else if (sort === 'hot') {
      const pipeline = [
        { $match: matchQuery },
        { $sort: { authorHasVartalapBadge: -1, hotScore: -1, createdAt: -1 } },
        { $skip: startIndex },
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      const aggregatedPosts = await Post.aggregate(pipeline);
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    } else {
      // 'top' sort using Aggregation Pipeline for netVotes
      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            netVotes: { $subtract: [ { $size: { $ifNull: ["$upvotes", []] } }, { $size: { $ifNull: ["$downvotes", []] } } ] }
          }
        },
        { $sort: { authorHasVartalapBadge: -1, netVotes: -1, createdAt: -1 } },
        { $skip: startIndex }, 
        { $limit: limitNum },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "post",
            pipeline: [
              { $match: { author: { $ne: null } } }
            ],
            as: "comments"
          }
        }
      ];
      
      const aggregatedPosts = await Post.aggregate(pipeline);
      
      posts = await Post.populate(aggregatedPosts, [
        { path: 'author', select: 'username profilePic' },
        { path: 'community', select: 'name profilePic' }
      ]);
    }

    const hasMore = startIndex + limitNum < totalDocs;

    const responseData = {
      posts: posts,
      hasMore,
      page: pageNum,
      totalPages: Math.ceil(totalDocs / limitNum)
    };

    // ⚡ Caching: Store the result in Redis for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// CREATE A NEW POST
router.post('/create', verifyToken, upload.array('media', 16), contentFilter, async (req, res) => {
  try {
    const { title, content, communityId, postType, link, bountyAmount, pollOptions, pollDurationDays } = req.body;
    const media = [];

    // ... (media handling remains same)
    if (req.files && req.files.length > 0) {
      // ... (validation remains same)
      req.files.forEach(file => {
        const fileUrl = file.path || file.secure_url || "";
        let url = fileUrl.startsWith('http') ? fileUrl : `/uploads/${file.filename}`;
        
        // 🔥 Cloudinary Auto-Optimization: Image size ghata dega drastically bina quality loose kiye
        if (url.includes('cloudinary.com') && url.includes('/upload/')) {
          url = url.replace('/upload/', '/upload/q_auto,f_auto,w_1080/');
        }

        media.push({
          url,
          mimetype: file.mimetype
        });
      });
    }

    // 🛡️ SECURITY CHECK: Verify if the user is a member of the community
    const Community = require('../models/Community');
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ error: "Community not found!" });
    }

    // 🛡️ FEATURE FLAG CHECK: Is user allowed to post?
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user?.disabledFeatures?.includes('post')) {
      return res.status(403).json({ error: "Your posting privileges have been temporarily disabled." });
    }

    const Setting = require('../models/Setting');
    const globalPostSetting = await Setting.findOne({ key: 'global_disable_post' });
    if (globalPostSetting && globalPostSetting.value === 'true' && !user.isAdmin) {
      return res.status(403).json({ error: "Post creation is currently disabled platform-wide by admins." });
    }

    if (postType === 'poll') {
      if (user?.adminFeatures?.includes('poll') || user?.disabledFeatures?.includes('poll')) {
          return res.status(403).json({ error: "Your access to create polls has been disabled." });
      }
      const globalPollSetting = await Setting.findOne({ key: 'global_disable_poll' });
      if (globalPollSetting && globalPollSetting.value === 'true' && !user.isAdmin) {
          return res.status(403).json({ error: "Poll creation is currently disabled platform-wide." });
      }
    }

    const isCreator = community.creator && community.creator.toString() === req.user.id;
    const isMod = community.moderators && community.moderators.some(id => id.toString() === req.user.id);

    if (postType === 'poll' && !isCreator && !isMod) {
      return res.status(403).json({ error: "Only community admins can create polls! 🛑" });
    }

    if (!community.members.includes(req.user.id)) {
      // Allow creator or mod even if they aren't explicit members (edge case safety)
      if (!isCreator && !isMod) {
        return res.status(403).json({ error: "You can only post in communities you have joined! 🛑" });
      }
    }

    // 🏆 Bounty System Logic: Deduct Anubhav from Author
    const bounty = parseInt(bountyAmount, 10) || 0;

    if (bounty > 0) {
      if (user.anubhav < bounty) return res.status(400).json({ error: "Not enough Anubhav points for this bounty!" });
      user.anubhav -= bounty;
      await user.save();
    }

    let parsedPollOptions = [];
    let pollEndsAt = null;

    if (postType === 'poll' && pollOptions) {
      try {
        const optionsList = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
        parsedPollOptions = optionsList.map(opt => ({ option: opt, votes: [] }));
        
        if (pollDurationDays) {
          pollEndsAt = new Date();
          pollEndsAt.setDate(pollEndsAt.getDate() + parseInt(pollDurationDays, 10));
        }
      } catch(e) {
        console.error("Error parsing poll options", e);
      }
    }

    const newPost = new Post({
      title,
      content: (postType === 'text' || postType === 'poll') ? (content || "") : "",
      media: postType === 'media' ? media : [],
      community: communityId,
      author: req.user.id,
      postType: postType || 'text',
      link: postType === 'link' ? (link || "") : "",
      bountyAmount: bounty,
      pollOptions: postType === 'poll' ? parsedPollOptions : [],
      pollEndsAt: postType === 'poll' ? pollEndsAt : null
    });

    const savedPost = await newPost.save();

    // Populate post so the frontend receives full author details
    await savedPost.populate('author', 'username profilePic');
    await savedPost.populate('community', 'name');

    // Emit real-time event
    if (req.io) {
      req.io.emit('new_post', savedPost);
    }

    // ⚡ Cache Invalidation: New post created, so clear all feed caches
    // A simple strategy is to delete all keys related to post lists.
    const keys = await redisClient.keys('posts:*');
    if (keys.length > 0) await redisClient.del(keys);
    console.log(`[Cache] Invalidated ${keys.length} post list caches due to new post.`);

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
    const hasDownvoted = postCheck.downvotes.includes(userId);
    let update = {};

    const User = require('../models/User');
    let anubhavChange = 0;

    if (hasUpvoted) {
      // Toggle off: Remove from upvotes
      update = { $pull: { upvotes: userId } };
      anubhavChange = -1;
    } else {
      // Toggle on: Add to upvotes, Remove from downvotes
      update = { 
        $addToSet: { upvotes: userId },
        $pull: { downvotes: userId }
      };
      anubhavChange = hasDownvoted ? 2 : 1;
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after' }
    );

    // Apply Anubhav change to author
    if (post.author.toString() !== userId && anubhavChange !== 0) {
      await User.findByIdAndUpdate(post.author, { $inc: { anubhav: anubhavChange } });
    }

    // Create Notification (if not already upvoted by this user before)
    // Note: Since we use findByIdAndUpdate, we check if user was already in upvotes list
    // But for simplicity and to avoid race conditions, we'll just check if the author is different
    if (post.author.toString() !== userId && anubhavChange > 0) {
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
    
    // 🔥 Update Hot Score
    post.hotScore = calculateHotScore(post);
    await post.save();

    // ⚡ Cache Invalidation: Post data changed, clear relevant caches
    const postCacheKey = `post:${req.params.id}`;
    const listCacheKeys = await redisClient.keys('posts:*'); // Clear all list caches
    const keysToDel = [postCacheKey, ...listCacheKeys];
    if (keysToDel.length > 0) await redisClient.del(keysToDel);
    console.log(`[Cache] Invalidated post ${req.params.id} and list caches due to vote.`);

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
    const hasUpvoted = postCheck.upvotes.includes(userId);
    let update = {};

    const User = require('../models/User');
    let anubhavChange = 0;

    if (hasDownvoted) {
      // Toggle off: Remove from downvotes
      update = { $pull: { downvotes: userId } };
      anubhavChange = 1;
    } else {
      // Toggle on: Add to downvotes, Remove from upvotes
      update = { 
        $addToSet: { downvotes: userId },
        $pull: { upvotes: userId }
      };
      anubhavChange = hasUpvoted ? -2 : -1;
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after' }
    );

    // Apply Anubhav change to author
    if (post.author.toString() !== userId && anubhavChange !== 0) {
      await User.findByIdAndUpdate(post.author, { $inc: { anubhav: anubhavChange } });
    }

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
    
    // 🔥 Update Hot Score
    post.hotScore = calculateHotScore(post);
    await post.save();

    // ⚡ Cache Invalidation: Post data changed, clear relevant caches
    const postCacheKey = `post:${req.params.id}`;
    const listCacheKeys = await redisClient.keys('posts:*'); // Clear all list caches
    const keysToDel = [postCacheKey, ...listCacheKeys];
    if (keysToDel.length > 0) await redisClient.del(keysToDel);
    console.log(`[Cache] Invalidated post ${req.params.id} and list caches due to vote.`);

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
    // ⚡ Caching: Check for single post cache
    const cacheKey = `post:${req.params.id}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    // 1. Invalid ID format check (Prevents Server 500 CastError crash)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid Post ID format!" });
    }

    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('community', 'name');

    // 2. Soft-deleted post check (Security Leak Fix)
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post nahi mili bhai!" });
    }

    // ⚡ Caching: Store the result in Redis for 1 hour (3600 seconds)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(post));
    res.json(post);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
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

    // ⚡ Cache Invalidation: Post data changed, clear relevant caches
    const postCacheKey = `post:${req.params.id}`;
    const listCacheKeys = await redisClient.keys('posts:*');
    const keysToDel = [postCacheKey, ...listCacheKeys];
    if (keysToDel.length > 0) await redisClient.del(keysToDel);

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

    // ⚡ Cache Invalidation: Post deleted, clear relevant caches
    const postCacheKey = `post:${req.params.id}`;
    const listCacheKeys = await redisClient.keys('posts:*');
    const keysToDel = [postCacheKey, ...listCacheKeys];
    if (keysToDel.length > 0) await redisClient.del(keysToDel);
    console.log(`[Cache] Invalidated post ${req.params.id} and list caches due to deletion.`);

    res.json({ message: "Post deleted successfully! 🗑️" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: 'Failed to delete post.' });
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

// VOTE ON A POLL
router.put('/:id/vote', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.postType !== 'poll') {
      return res.status(400).json({ message: "This post is not a poll." });
    }

    if (post.pollEndsAt && new Date() > post.pollEndsAt) {
      return res.status(400).json({ message: "The poll has expired." });
    }

    const { optionIndex } = req.body;
    const userId = req.user.id;

    if (optionIndex < 0 || optionIndex >= post.pollOptions.length) {
      return res.status(400).json({ message: "Invalid option selected." });
    }

    // Check if the user already voted on any option 
    // And remove their vote from other options if they are changing it
    let alreadyVoted = false;
    post.pollOptions.forEach((opt, idx) => {
      const voteIndex = opt.votes.indexOf(userId);
      if (voteIndex > -1) {
        if (idx === optionIndex) {
          alreadyVoted = true; // Voted for the exact same option
        } else {
          opt.votes.splice(voteIndex, 1); // Remove previous vote from other option
        }
      }
    });

    if (alreadyVoted) {
      return res.status(400).json({ message: "You have already voted for this option." });
    }

    // Add new vote to the selected option
    post.pollOptions[optionIndex].votes.push(userId);

    await post.save();
    
    // ⚡ Cache Invalidation: Post data changed, clear relevant caches
    const postCacheKey = `post:${req.params.id}`;
    const listCacheKeys = await redisClient.keys('posts:*');
    const keysToDel = [postCacheKey, ...listCacheKeys];
    if (keysToDel.length > 0) await redisClient.del(keysToDel);
    console.log(`[Cache] Invalidated post ${req.params.id} and list caches due to poll vote.`);

    // Check if we need to emit post_interaction
    if (req.io) req.io.emit('post_interaction', post._id);

    res.json({ message: "Vote cast successfully!", post });
  } catch(err) {
    console.error("Poll vote error:", err);
    res.status(500).json({ error: 'Failed to cast vote.' });
  }
});

module.exports = router;