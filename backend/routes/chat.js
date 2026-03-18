const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const multer = require('multer');
const chatCleanup = require('../services/chatCleanup');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Route: GET /api/chat
// Desc: Get all ACTIVE chat rooms
router.get('/', verifyToken, async (req, res) => {
    try {
        const rooms = await ChatRoom.find({ status: 'active' })
            .populate('creator', 'username profilePic')
            .populate('participants', 'username profilePic')
            .sort({ createdAt: -1 });
        res.status(200).json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error fetching chat rooms." });
    }
});

// Route: POST /api/chat
// Desc: Create a new chat room
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: "Room name is required." });
        }

        const newRoom = new ChatRoom({
            name,
            creator: req.user.id,
            participants: [req.user.id]
        });

        await newRoom.save();

        // Broadcast to all clients that a new room exists
        req.io.emit('new_chat_room', newRoom);

        res.status(201).json(newRoom);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error creating room." });
    }
});

// Route: GET /api/chat/:id
// Desc: Get room details and message history
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.id)
            .populate('creator', 'username')
            .populate('participants', 'username profilePic _id');
            
        if (!room) {
            return res.status(404).json({ message: "Room not found or has been destroyed." });
        }

        // 🛡️ SECURITY: Check if user is a participant or an admin
        const isParticipant = room.participants.some(p => p._id.toString() === req.user.id);
        if (!isParticipant && !req.user.isAdmin) {
            return res.status(403).json({ message: "Access Denied: You have not been added to this private room." });
        }

        // Retrieve messages, populating sender info
        const messages = await ChatMessage.find({ room: room._id })
            .populate('sender', 'username profilePic')
            .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username' } })
            .sort({ createdAt: 1 }); // Oldest to newest for chat view

        res.status(200).json({ room, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error fetching room." });
    }
});

// Route: POST /api/chat/:id/add-member
// Desc: Add a user to a private chat room (Only Creators/Admins)
router.post('/:id/add-member', verifyToken, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        const room = await ChatRoom.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: "Room not found." });
        }

        // Check authentication
        if (room.creator.toString() !== req.user.id && !req.user.isAdmin) {
            const isParticipant = room.participants.some(p => p.toString() === req.user.id);
            if (!isParticipant || !room.membersCanInvite) {
                return res.status(403).json({ message: "Only the creator can add members unless the room allows participants to invite." });
            }
        }

        if (room.status === 'closed') {
            return res.status(400).json({ message: "Cannot add members to a closed room." });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }
        if (targetUser.isAdmin) {
            return res.status(403).json({ message: "Superadmins cannot be added to chat rooms." });
        }

        // Check if already a participant
        if (room.participants.includes(userId)) {
            return res.status(400).json({ message: "User is already a member of this room." });
        }

        // Alert the specific user globally so they know they got invited via ephemeral toast
        req.io.emit('room_invite', { roomId: room._id, roomName: room.name, invitedUserId: userId });

        // Database Notification Tracking
        const existingNotif = await Notification.findOne({
            recipient: userId,
            sender: req.user.id,
            type: 'chat_invite',
            roomId: room._id
        });

        if (!existingNotif) {
            const newNotif = await Notification.create({
                recipient: userId,
                sender: req.user.id,
                type: 'chat_invite',
                roomId: room._id,
                content: `invited you to chat in ${room.name}`
            });
            await newNotif.populate('sender', 'username profilePic');
            if (req.io) req.io.to(userId.toString()).emit('new_notification', newNotif);
        }

        res.status(200).json({ message: "Invitation sent successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error sending invitation." });
    }
});

// Route: POST /api/chat/invite/accept
// Desc: Accept a chat room invitation
router.post('/invite/accept', verifyToken, async (req, res) => {
    try {
        const { notificationId } = req.body;
        if (!notificationId) return res.status(400).json({ message: "Notification ID is required." });

        const notification = await Notification.findById(notificationId);
        if (!notification || notification.recipient.toString() !== req.user.id) {
            return res.status(404).json({ message: "Invitation not found." });
        }

        const room = await ChatRoom.findById(notification.roomId);
        if (!room) {
            await Notification.findByIdAndDelete(notificationId);
            return res.status(404).json({ message: "Room no longer exists." });
        }

        if (room.status === 'closed') {
            await Notification.findByIdAndDelete(notificationId);
            return res.status(400).json({ message: "Cannot join a closed room." });
        }

        if (!room.participants.includes(req.user.id)) {
            room.participants.push(req.user.id);
            await room.save();
            await room.populate('participants', 'username profilePic _id');
            req.io.to(`room_${room._id}`).emit('member_added', { roomId: room._id, participants: room.participants, newMemberId: req.user.id });
        }

        await Notification.findByIdAndDelete(notificationId);
        res.status(200).json({ message: "Joined room successfully." });
    } catch (err) {
        console.error("Accept invite error:", err);
        res.status(500).json({ message: "Server error accepting invitation." });
    }
});

// Route: POST /api/chat/invite/decline
// Desc: Decline a chat room invitation
router.post('/invite/decline', verifyToken, async (req, res) => {
    try {
        const { notificationId } = req.body;
        if (!notificationId) return res.status(400).json({ message: "Notification ID is required." });

        const notification = await Notification.findById(notificationId);
        if (notification && notification.recipient.toString() === req.user.id) {
            await Notification.findByIdAndDelete(notificationId);
        }

        res.status(200).json({ message: "Invitation declined." });
    } catch (err) {
        console.error("Decline invite error:", err);
        res.status(500).json({ message: "Server error declining invitation." });
    }
});

// Route: PUT /api/chat/:id/settings
// Desc: Toggle room settings (membersCanInvite)
router.put('/:id/settings', verifyToken, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.id);
        if (!room) return res.status(404).json({ message: "Room not found." });
        
        if (room.creator.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Only the creator can change room settings." });
        }

        room.membersCanInvite = !room.membersCanInvite;
        await room.save();

        req.io.to(`room_${room._id}`).emit('room_settings_updated', { membersCanInvite: room.membersCanInvite });
        res.status(200).json({ message: "Settings updated", membersCanInvite: room.membersCanInvite });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error updating settings" });
    }
});

// Route: POST /api/chat/:roomId/kick-member
// Desc: Kick a member from the room
router.post('/:roomId/kick-member', verifyToken, async (req, res) => {
    try {
        const { userId } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room) return res.status(404).json({ message: "Room not found." });

        if (room.creator.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Only the creator can kick members." });
        }

        if (room.creator.toString() === userId) {
            return res.status(400).json({ message: "Cannot kick the room creator." });
        }

        room.participants = room.participants.filter(p => p.toString() !== userId);
        await room.save();

        req.io.to(`room_${room._id}`).emit('member_kicked', { userId });
        await room.populate('participants', 'username profilePic _id');
        res.status(200).json({ message: "Member kicked", participants: room.participants });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error kicking member" });
    }
});

// Route: DELETE /api/chat/:roomId/messages/:messageId
// Desc: Delete a message and its media
router.delete('/:roomId/messages/:messageId', verifyToken, async (req, res) => {
    try {
        const msg = await ChatMessage.findById(req.params.messageId);
        if (!msg) return res.status(404).json({ message: "Message not found" });

        if (msg.sender.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Access Denied" });
        }

        // Remove media
        if (msg.media && msg.media.length > 0) {
            let cloudinaryIds = [];
            let localFiles = [];
            msg.media.forEach(m => {
                if(m.public_id && m.url && m.url.includes('cloudinary')) {
                    cloudinaryIds.push(m.public_id);
                } else if(m.public_id) {
                    localFiles.push(m.public_id);
                }
            });
            if (cloudinaryIds.length > 0) {
                try {
                    await cloudinary.api.delete_resources(cloudinaryIds);
                } catch(e) { console.error("Cloudinary single wipe error:", e); }
            }
            if(localFiles.length > 0) {
                localFiles.forEach(f => {
                    const filepath = path.join(__dirname, '../../uploads', f);
                    if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
                });
            }
        }
        await ChatMessage.findByIdAndDelete(req.params.messageId);
        req.io.to(`room_${req.params.roomId}`).emit('message_deleted', req.params.messageId);
        res.status(200).json({ message: "Message deleted" });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting message" });
    }
});

// Route: PUT /api/chat/:roomId/messages/:messageId
// Desc: Edit a message (text/codeSnippet)
router.put('/:roomId/messages/:messageId', verifyToken, async (req, res) => {
    try {
        const { text, codeSnippet } = req.body;
        const msg = await ChatMessage.findById(req.params.messageId);
        if (!msg) return res.status(404).json({ message: "Message not found" });

        if (msg.sender.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Access Denied" });
        }

        msg.text = text;
        msg.codeSnippet = codeSnippet;
        msg.isEdited = true;
        await msg.save();

        const updatedMsg = await ChatMessage.findById(msg._id)
            .populate('sender', 'username profilePic')
            .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username' } });

        req.io.to(`room_${req.params.roomId}`).emit('message_edited', updatedMsg);
        res.status(200).json({ message: "Message updated", msg: updatedMsg });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Error updating message" });
    }
});

// Route: PUT /api/chat/:id/close
// Desc: Close the room and start the self-destruct timer
router.put('/:id/close', verifyToken, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: "Room not found." });
        }

        // Check authentication
        if (room.creator.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Only the creator or an admin can close this room." });
        }

        if (room.status === 'closed') {
            return res.status(400).json({ message: "Room is already closed and pending destruction." });
        }

        // Mark as closed and track the time
        room.status = 'closed';
        room.closedAt = new Date();
        await room.save();

        // Alert the room that it's closing
        req.io.to(`room_${room._id}`).emit('room_closed', { roomId: room._id, message: "Room closed. Self-destructing in 2 minutes." });
        
        // Let the lobby know the room is gone
        req.io.emit('room_removed', room._id);

        // 🔥 Engage self-destruct sequence
        chatCleanup.scheduleDestruction(room._id);

        res.status(200).json({ message: "Room closed successfully. Deletion scheduled." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error closing room." });
    }
});

module.exports = router;
