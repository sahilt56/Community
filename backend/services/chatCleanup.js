const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// ⏱️ The exactly 2 Minutes Timer
const DESTRUCTION_DELAY_MS = 2 * 60 * 1000;

/**
 * 🧹 Vartalap Auto-Destruct Function
 * @param {String} roomId The ID of the ChatRoom to destroy
 */
const destroyRoomData = async (roomId) => {
    try {
        console.log(`[CLEANUP] 🚨 Initiating Self-Destruct for Room: ${roomId}`);
        
        // 1. Fetch all messages in the room to find media
        const messages = await ChatMessage.find({ room: roomId });
        
        // Array to collect Cloudinary public_ids and local filenames
        let cloudinaryIds = [];
        let localFiles = [];

        messages.forEach(msg => {
            if (msg.media && msg.media.length > 0) {
                msg.media.forEach(m => {
                    if (m.public_id && m.url && m.url.includes('cloudinary')) {
                        cloudinaryIds.push(m.public_id);
                    } else if (m.public_id) { // Fallback local file check
                        localFiles.push(m.public_id);
                    }
                });
            }
        });

        // 2. Erase from Cloudinary (Batch Destroy)
        if (cloudinaryIds.length > 0) {
            try {
                await cloudinary.api.delete_resources(cloudinaryIds);
                console.log(`[CLEANUP] ☁️ Wiped ${cloudinaryIds.length} media files from Cloudinary.`);
            } catch (cloudErr) {
                console.error("[CLEANUP] ⚠️ Cloudinary Wipe Error:", cloudErr);
            }
        }

        // 3. Erase from Local Disk (If no Cloudinary)
        if (localFiles.length > 0) {
            localFiles.forEach(filename => {
                const filepath = path.join(__dirname, '../../uploads', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            });
            console.log(`[CLEANUP] 💻 Wiped ${localFiles.length} media files from Local Disk.`);
        }

        // 4. Nuke the Messages from MongoDB
        const delMsgs = await ChatMessage.deleteMany({ room: roomId });
        console.log(`[CLEANUP] 📃 Incinerated ${delMsgs.deletedCount} messages.`);

        // 5. Nuke the Room itself from MongoDB
        await ChatRoom.findByIdAndDelete(roomId);
        console.log(`[CLEANUP] 💥 Room ${roomId} has been completely erased from existence.`);

    } catch (err) {
        console.error(`[CLEANUP] ❌ FATAL ERROR destroying room ${roomId}:`, err);
    }
};

/**
 * Schedules a room for destruction.
 */
const scheduleDestruction = (roomId) => {
    console.log(`[CLEANUP] ⏱️ Room ${roomId} closed. Self-destruct sequence engaged. T-Minus 2 minutes.`);
    setTimeout(() => {
        destroyRoomData(roomId);
    }, DESTRUCTION_DELAY_MS);
};

/**
 * Fast-catch cleanup. Runs when the NodeJS server starts.
 * If the server crashed while a room was counting down to destruction, 
 * this sweeps up any rooms that are marked 'closed' but still exist in the database.
 */
const initializeCleanupSweep = async () => {
    try {
        const deceasedRooms = await ChatRoom.find({ status: 'closed' });
        if (deceasedRooms.length > 0) {
            console.log(`[CLEANUP] 🧹 Startup Sweep: Found ${deceasedRooms.length} closed rooms that survived a server crash. Destroying now...`);
            deceasedRooms.forEach(room => {
                // To be safe against a crash during the exact 2 min window
                const timeSinceClose = Date.now() - new Date(room.closedAt).getTime();
                
                if (timeSinceClose >= DESTRUCTION_DELAY_MS) {
                    // Time already passed, destroy instantly
                    destroyRoomData(room._id);
                } else {
                    // Time hasn't fully passed yet, schedule the remainder
                    const remainingTime = DESTRUCTION_DELAY_MS - timeSinceClose;
                    setTimeout(() => destroyRoomData(room._id), remainingTime);
                }
            });
        }
    } catch (err) {
        console.error("[CLEANUP] ⚠️ Failed startup sweep:", err);
    }
};

module.exports = {
    scheduleDestruction,
    initializeCleanupSweep
};
