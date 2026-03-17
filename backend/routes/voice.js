const express = require('express');
const router = express.Router();
const VoiceRoom = require('../models/VoiceRoom');
const Community = require('../models/Community');
const verifyToken = require('../middleware/verifyToken');

// CREATE A VOICE ROOM
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, communityId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Check if user is creator, mod, or member
    const isCreator = community.creator.toString() === req.user.id;
    const isMod = community.moderators && community.moderators.some(id => id.toString() === req.user.id);

    if (!isCreator && !isMod) {
      return res.status(403).json({ message: "Only community admins can start a voice party." });
    }

    // 🛡️ FEATURE FLAG CHECK
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user?.disabledFeatures?.includes('voice')) {
       return res.status(403).json({ message: "Your access to start voice parties has been disabled." });
    }
    const Setting = require('../models/Setting');
    const globalVoiceSetting = await Setting.findOne({ key: 'global_disable_voice' });
    if (globalVoiceSetting && globalVoiceSetting.value === 'true' && !user.isAdmin) {
       return res.status(403).json({ message: "Voice parties are currently disabled platform-wide." });
    }

    const room = new VoiceRoom({
      name,
      community: communityId,
      creator: req.user.id,
      participants: [] // Users will join via socket later
    });

    await room.save();
    await room.populate('creator', 'username profilePic');
    res.status(201).json(room);
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create voice room' });
  }
});

// GET ACTIVE ROOMS FOR A COMMUNITY
router.get('/community/:communityId', async (req, res) => {
  try {
    const rooms = await VoiceRoom.find({
      community: req.params.communityId,
      isActive: true
    }).populate('creator', 'username profilePic');

    res.json(rooms);
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Failed to get voice rooms' });
  }
});

// END A VOICE ROOM
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const room = await VoiceRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.creator.toString() !== req.user.id) {
       return res.status(403).json({ message: "Not authorized to end this room" });
    }

    room.isActive = false;
    await room.save();
    
    // In server.js we should ideally broadcast to the socket room that it ended
    if (req.io) {
      req.io.to(`voice-${room._id}`).emit('voice-room-ended');
    }

    res.json({ message: "Voice room ended" });
  } catch (err) {
    console.error('End room error:', err);
    res.status(500).json({ error: 'Failed to end voice room' });
  }
});

module.exports = router;
