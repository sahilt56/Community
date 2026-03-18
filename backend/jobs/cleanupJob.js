const cron = require('node-cron');
const mongoose = require('mongoose');
const https = require('https');
const Notification = require('../models/Notification');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Setting = require('../models/Setting');

// Helper to check if auto-cleanup is enabled
const isAutoCleanupEnabled = async () => {
    try {
        const setting = await Setting.findOne({ key: 'auto_cleanup_enabled' });
        return setting && setting.value === true;
    } catch (e) {
        return false;
    }
};

const runCleanup = async () => {
    console.log("[Auto-Cleanup] Job started at", new Date().toISOString());
    try {
        const isEnabled = await isAutoCleanupEnabled();
        if (!isEnabled) {
            console.log("[Auto-Cleanup] Job skipped: Auto-cleanup is disabled in Settings.");
            return;
        }

        let totalDeleted = 0;
        const now = new Date();

        // 1. Delete Read Notifications older than 7 days
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const deletedNotifs = await Notification.deleteMany({ 
            isRead: true, 
            createdAt: { $lt: sevenDaysAgo } 
        });
        totalDeleted += deletedNotifs.deletedCount;
        console.log(`[Auto-Cleanup] Deleted ${deletedNotifs.deletedCount} old read notifications.`);

        // 2. Delete Soft-Deleted Posts older than 30 days
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const deletedPosts = await Post.deleteMany({
            isDeleted: true,
            updatedAt: { $lt: thirtyDaysAgo } // Use updatedAt to see when it was soft-deleted
        });
        totalDeleted += deletedPosts.deletedCount;
        console.log(`[Auto-Cleanup] Hard-deleted ${deletedPosts.deletedCount} old soft-deleted posts.`);

        // 3. Delete Resolved/Dismissed Reports older than 30 days
        const deletedReports = await Report.deleteMany({
            status: { $in: ['reviewed', 'dismissed'] },
            updatedAt: { $lt: thirtyDaysAgo }
        });
        totalDeleted += deletedReports.deletedCount;
        console.log(`[Auto-Cleanup] Deleted ${deletedReports.deletedCount} old resolved reports.`);

        console.log(`[Auto-Cleanup] Job finished. Total documents removed to save space: ${totalDeleted}`);
        
        // Record last run time
        await Setting.findOneAndUpdate(
            { key: 'auto_cleanup_last_run' },
            { value: now.toISOString(), description: `Last run removed ${totalDeleted} records.` },
            { upsert: true, returnDocument: 'after' }
        );

    } catch (err) {
        console.error("[Auto-Cleanup] Job failed with error:", err);
    }
};

// Self-Ping function to keep the Render free tier server awake
const keepServerAwake = () => {
    // Ping the server every 10 minutes (600,000 milliseconds)
    // Render typically sleeps after 15 minutes of inactivity
    const PING_INTERVAL = 10 * 60 * 1000;
    
    setInterval(() => {
        const backendUrl = process.env.API_URL || 'https://api.vartalap.live';
        https.get(backendUrl, (res) => {
            if (res.statusCode === 200) {
                console.log(`[Self-Ping] Server actively kept awake at ${new Date().toISOString()}`);
            } else {
                console.log(`[Self-Ping] Server ping failed with status: ${res.statusCode}`);
            }
        }).on('error', (err) => {
            console.error('[Self-Ping] Error keeping server awake:', err.message);
        });
    }, PING_INTERVAL);
};

// Schedule job to run every day at Midnight (00:00) server time
const startCronJob = () => {
    // '0 0 * * *' = at minute 0 past hour 0
    cron.schedule('0 0 * * *', () => {
        runCleanup();
    });
    console.log("🟢 Auto-Cleanup Cron Job scheduled to run daily at midnight.");
    
    // Start the keep-awake interval as soon as the app starts
    keepServerAwake();
};

module.exports = { startCronJob, runCleanup };
