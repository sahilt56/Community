const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Community = require('../models/Community');
const verifyToken = require('../middleware/verifyToken');

// CREATE AN EVENT
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, date, location, communityId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Check if user is creator, mod, or member
    const isCreator = community.creator.toString() === req.user.id;
    const isMod = community.moderators && community.moderators.some(id => id.toString() === req.user.id);

    if (!isCreator && !isMod) {
      return res.status(403).json({ message: "Only community admins can create an event." });
    }

    // 🛡️ FEATURE FLAG CHECK
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user?.disabledFeatures?.includes('event')) {
       return res.status(403).json({ message: "Your access to create events has been disabled." });
    }
    const Setting = require('../models/Setting');
    const globalEventSetting = await Setting.findOne({ key: 'global_disable_event' });
    if (globalEventSetting && globalEventSetting.value === 'true' && !user.isAdmin) {
       return res.status(403).json({ message: "Events are currently disabled platform-wide." });
    }

    const event = new Event({
      name,
      description,
      date,
      location,
      community: communityId,
      creator: req.user.id,
      attendees: [req.user.id] // Creator attends by default
    });

    await event.save();
    await event.populate('creator', 'username profilePic');
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET EVENTS FOR A COMMUNITY
router.get('/community/:communityId', async (req, res) => {
  try {
    // Return upcoming events, sorted by date
    const events = await Event.find({
      community: req.params.communityId,
      date: { $gte: new Date() } // Only future events
    })
    .sort({ date: 1 })
    .populate('creator', 'username profilePic');

    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// RSVP TO AN EVENT
router.post('/:id/rsvp', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = req.user.id;
    const isAttending = event.attendees.includes(userId);

    if (isAttending) {
      event.attendees.pull(userId);
    } else {
      event.attendees.push(userId);
    }

    await event.save();
    res.json(event);
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ error: 'Failed to RSVP' });
  }
});

// DELETE AN EVENT
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('community');
    if (!event) return res.status(404).json({ message: "Event not found" });

    const community = event.community;
    const isEventCreator = event.creator.toString() === req.user.id;
    const isCommCreator = community && community.creator.toString() === req.user.id;
    const isMod = community && community.moderators?.some(modId => modId.toString() === req.user.id);

    if (!isEventCreator && !isCommCreator && !isMod) {
      return res.status(403).json({ message: "Not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
