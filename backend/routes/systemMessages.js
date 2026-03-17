const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const SystemMessage = require('../models/SystemMessage');
const User = require('../models/User');

// Route: GET /api/system-messages
// Desc: Get all system messages. If logged in, also return the user's read states.
router.get('/', async (req, res) => {
    try {
        const messages = await SystemMessage.find()
            .populate('createdBy', 'username profilePic isAdmin')
            .sort({ createdAt: -1 });
        
        // Optional auth check to see what the user has read
        let readMessageIds = [];
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (token) {
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('readSystemMessages');
                if (user && user.readSystemMessages) {
                    readMessageIds = user.readSystemMessages;
                }
            } catch (e) {
                // Ignore invalid tokens for fetching the general list
            }
        }

        res.status(200).json({
            messages,
            readMessageIds
        });
    } catch (err) {
        console.error("System messages GET error:", err);
        res.status(500).json({ message: "Failed to load system messages." });
    }
});

// Route: POST /api/system-messages
// Desc: Create a new system message format. ONLY accessible to superadmins.
router.post('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Access Denied: Only Superadmins can broadcast system messages." });
        }

        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required." });
        }

        const newMessage = new SystemMessage({
            title,
            content,
            createdBy: req.user.id
        });

        await newMessage.save();
        await newMessage.populate('createdBy', 'username profilePic isAdmin');

        // Note: Real-time broadcast using socketio
        if (req.io) {
            req.io.emit('new_system_message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error("System messages POST error:", err);
        res.status(500).json({ message: "Failed to broadcast message." });
    }
});

// Route: PUT /api/system-messages/mark-all-read
// Desc: Mark all system messages as read for the current user
router.put('/mark-all-read', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const allMessages = await SystemMessage.find({}, '_id');
        const allMsgIds = allMessages.map(m => m._id.toString());
        
        user.readSystemMessages = allMsgIds;
        await user.save();

        res.status(200).json({ message: "All messages marked as read.", readMessageIds: user.readSystemMessages });
    } catch (err) {
        console.error("System messages PUT mark-all-read error:", err);
        res.status(500).json({ message: "Failed to mark all as read." });
    }
});

// Route: PUT /api/system-messages/:id/read
// Desc: Mark a system message as read by the current user
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const messageId = req.params.id;
        
        // Verify message exists
        const messageExists = await SystemMessage.exists({ _id: messageId });
        if (!messageExists) {
            return res.status(404).json({ message: "Message not found." });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Add to read array if not already present
        if (!user.readSystemMessages) user.readSystemMessages = [];
        
        if (!user.readSystemMessages.includes(messageId)) {
            user.readSystemMessages.push(messageId);
            await user.save();
        }

        res.status(200).json({ message: "Marked as read.", readMessageIds: user.readSystemMessages });
    } catch (err) {
        console.error("System messages PUT read error:", err);
        res.status(500).json({ message: "Failed to mark as read." });
    }
});

// Route: DELETE /api/system-messages/:id
// Desc: Delete a system message. ONLY accessible to superadmins.
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Access Denied: Only Superadmins can delete broadcast messages." });
        }

        const deletedMessage = await SystemMessage.findByIdAndDelete(req.params.id);
        
        if (!deletedMessage) {
            return res.status(404).json({ message: "Message not found." });
        }

        res.status(200).json({ message: "Announcement deleted successfully." });
    } catch (err) {
        console.error("System messages DELETE error:", err);
        res.status(500).json({ message: "Failed to delete system message." });
    }
});

module.exports = router;
