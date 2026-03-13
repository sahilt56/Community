const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Community = require('../models/Community');
const verifyToken = require('../middleware/verifyToken'); 
const upload = require('../middleware/upload');
const contentFilter = require('../middleware/contentFilter');

// CREATE A NEW COMMUNITY
router.post('/create', verifyToken, contentFilter, async (req, res) => {
  try {
    const { name, description, minAnubhav = 0, minAgeDays = 0 } = req.body;

    // Check karo ki is naam ki community pehle se toh nahi hai
    const existingCommunity = await Community.findOne({ name });
    if (existingCommunity) {
      return res.status(400).json({ message: "Community name already taken!" });
    }

    // Nayi Community create karo
    const newCommunity = new Community({
      name,
      description,
      creator: req.user.id, 
      members: [req.user.id],
      minAnubhav,
      minAgeDays
    });

    const savedCommunity = await newCommunity.save();
    
    res.status(201).json({
      message: "Community created successfully!",
      community: savedCommunity
    });

  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// GET ALL COMMUNITIES
router.get('/', async (req, res) => {
  try {
    const { sort } = req.query;
    let communities = await Community.find();

    if (sort === 'popular') {
      // Sort by member count descending
      communities.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
    } else {
      // Default: Newest first
      communities.sort((a, b) => b.createdAt - a.createdAt);
    }

    res.json(communities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET SINGLE COMMUNITY BY ID OR NAME
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let community;

    // Check if ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      community = await Community.findById(id)
        .populate('creator', 'username profilePic')
        .populate('members', 'username profilePic')
        .populate('moderators', 'username profilePic'); // Added moderator population
    }

    // If not found by ID or not a valid ID, try finding by name
    if (!community) {
      community = await Community.findOne({ name: id })
        .populate('creator', 'username profilePic')
        .populate('members', 'username profilePic')
        .populate('moderators', 'username profilePic'); // Added moderator population
    }
    
    if (!community) {
      return res.status(404).json({ message: "Community not found!" });
    }
    res.json(community);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// UPDATE COMMUNITY
router.put('/:id/update', verifyToken, upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'bannerPic', maxCount: 1 }]), contentFilter, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Ensure only the creator or a moderator can edit
    const isCreator = community.creator.toString() === req.user.id;
    const isMod = community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isCreator && !isMod) {
      return res.status(403).json({ message: "Only the creator or moderators can edit this community! 🛑" });
    }

    const { name, description, topic, minAnubhav, minAgeDays } = req.body;

    // Optional: if name changes, check if it's already taken by another community
    if (name && name !== community.name) {
      const existing = await Community.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Community name already taken!" });
      }
      community.name = name;
    }

    if (description) community.description = description;
    if (topic) community.topic = topic;
    if (minAnubhav !== undefined) community.minAnubhav = Number(minAnubhav);
    if (minAgeDays !== undefined) community.minAgeDays = Number(minAgeDays);

    // Update Rules if provided (expected as a JSON string from frontend FormData)
    if (req.body.rules) {
      try {
        community.rules = JSON.parse(req.body.rules);
      } catch (e) {
        console.error("Rules parsing error:", e);
      }
    }

    // Handle uploaded files
    if (req.files) {
      const { deleteFromCloudinary } = require('../utils/cloudinary');
      const fs = require('fs');
      const path = require('path');

      const deleteOldFile = async (oldUrl) => {
        if (!oldUrl) return;
        if (oldUrl.startsWith('http')) {
          await deleteFromCloudinary(oldUrl);
        } else {
          const filename = oldUrl.split('/').pop();
          const filePath = path.join(__dirname, '../uploads', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      };

      if (req.files['profilePic'] && req.files['profilePic'][0]) {
        await deleteOldFile(community.profilePic);
        const file = req.files['profilePic'][0];
        community.profilePic = file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
      }
      if (req.files['bannerPic'] && req.files['bannerPic'][0]) {
        await deleteOldFile(community.bannerPic);
        const file = req.files['bannerPic'][0];
        community.bannerPic = file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
      }
    }

    await community.save();
    
    // Broadcast community updated event
    if (req.io) {
      req.io.emit('community_updated', community);
    }

    res.status(200).json({ 
      message: "Community updated successfully! 🛠️", 
      community 
    });

  } catch (err) {
    console.error("Community update error:", err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// DELETE COMMUNITY IMAGE
router.delete('/:id/remove-image', verifyToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Ensure only the creator or a moderator can edit
    const isCreator = community.creator.toString() === req.user.id;
    const isMod = community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isCreator && !isMod) {
      return res.status(403).json({ message: "Only the creator or moderators can remove images! 🛑" });
    }

    const { type } = req.body; // 'profilePic' or 'bannerPic'
    if (!['profilePic', 'bannerPic'].includes(type)) {
      return res.status(400).json({ message: "Invalid type! Use 'profilePic' or 'bannerPic'" });
    }

    const oldUrl = community[type];
    if (oldUrl) {
      const { deleteFromCloudinary } = require('../utils/cloudinary');
      const fs = require('fs');
      const path = require('path');

      if (oldUrl.startsWith('http')) {
        await deleteFromCloudinary(oldUrl);
      } else {
        const filename = oldUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    community[type] = "";
    await community.save();

    res.status(200).json({ message: `${type === 'profilePic' ? 'Profile Picture' : 'Banner'} removed!`, community });
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// DELETE COMMUNITY
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Check ownership
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the creator can delete this community! 🛑" });
    }

    // Delete images from Cloudinary/Local before deleting community
    const { deleteFromCloudinary } = require('../utils/cloudinary');
    const fs = require('fs');
    const path = require('path');

    const deleteOldFile = async (oldUrl) => {
      if (!oldUrl) return;
      if (oldUrl.startsWith('http')) {
        await deleteFromCloudinary(oldUrl);
      } else {
        const filename = oldUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    await deleteOldFile(community.profilePic);
    await deleteOldFile(community.bannerPic);

    // Determine target ID before deletion for event broadcasting
    const targetId = community._id;

    // Hard Delete Community Document
    await Community.findByIdAndDelete(targetId);

    // Broadcast community deleted event
    if (req.io) {
      req.io.emit('community_deleted', targetId);
    }

    res.json({ message: "Community deleted successfully! 🗑️" });
  } catch (err) {
    console.error("Community delete error:", err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// JOIN COMMUNITY
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    const userId = req.user.id;

    // If already a member, return success
    if (community.members.includes(userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    // --- CHECK ELIGIBILITY ---
    const User = require('../models/User');
    const Post = require('../models/Post');
    const user = await User.findById(userId);

    // Calculate Anubhav (logic from user.js, excluding self-votes)
    const userPosts = await Post.find({ author: userId, isDeleted: { $ne: true } });
    let totalAnubhav = 0;
    userPosts.forEach(post => {
      const otherUpvotes = post.upvotes?.filter(id => id.toString() !== userId.toString()).length || 0;
      const otherDownvotes = post.downvotes?.filter(id => id.toString() !== userId.toString()).length || 0;
      totalAnubhav += (otherUpvotes - otherDownvotes);
    });

    // Calculate Account Age (in days)
    const msPerDay = 1000 * 60 * 60 * 24;
    const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / msPerDay);

    // Validate Constraints
    if (community.minAnubhav > 0 && totalAnubhav < community.minAnubhav) {
      return res.status(403).json({ message: `Need at least ${community.minAnubhav} Anubhav to join. You have ${totalAnubhav}.` });
    }
    if (community.minAgeDays > 0 && accountAgeDays < community.minAgeDays) {
      return res.status(403).json({ message: `Account must be at least ${community.minAgeDays} days old to join. Yours is ${accountAgeDays}.` });
    }

    // Add to members
    community.members.push(userId);
    await community.save();

    res.status(200).json({ message: "Successfully joined the community!", community });
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// LEAVE COMMUNITY
router.post('/:id/leave', verifyToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    const userId = req.user.id;

    // Remove from members
    if (community.members.includes(userId)) {
      community.members.pull(userId);
      await community.save();
    }

    res.status(200).json({ message: "Left the community.", community });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ADD MODERATOR
router.post('/:id/add-mod', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Only Creator can add mods
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the creator can add moderators" });
    }

    if (community.moderators.includes(userId)) {
      return res.status(400).json({ message: "User is already a moderator" });
    }

    community.moderators.push(userId);
    await community.save();
    res.json({ message: "Moderator added successfully", community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// REMOVE MODERATOR
router.post('/:id/remove-mod', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Only Creator can remove mods
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the creator can remove moderators" });
    }

    community.moderators = community.moderators.filter(id => id.toString() !== userId);
    await community.save();
    res.json({ message: "Moderator removed successfully", community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;