const express = require('express');
const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const Item = require('../models/Item');

const router = express.Router();

const VALID_ACTIONS = ['like', 'save', 'unsave', 'dismiss'];

const GENERIC_TAGS = new Set([
    'ai',
    'industry-news',
    'technology',
    'news'
]);

// POST /api/feedback
// Body: { userId, itemId, action }
router.post('/', async (req, res) => {
    try {
        const { userId, itemId, action } = req.body;

        // 1. Validate request
        if (!userId || !itemId || !action) {
            return res.status(400).json({
                error: 'userId, itemId, and action are required.'
            });
        }

        if (!mongoose.isValidObjectId(itemId)) {
            return res.status(400).json({
                error: 'Invalid itemId.'
            });
        }

        if (!VALID_ACTIONS.includes(action)) {
            return res.status(400).json({
                error: 'Invalid action. Use like, save, unsave, or dismiss.'
            });
        }

        // 2. Find profile and item
        const profile = await UserProfile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({
                error: 'User profile not found.'
            });
        }

        const item = await Item.findById(itemId).select('title topicTags');
        if (!item) {
            return res.status(404).json({
                error: 'Item not found.'
            });
        }

        const itemIdString = item._id.toString();

        // 3. Apply feedback
        if (action === 'like') {
            if (!profile.likedItems.some(id => id.toString() === itemIdString)) {
                profile.likedItems.push(item._id);
            }

            // A liked item should no longer be dismissed.
            profile.dismissedItems = profile.dismissedItems.filter(
                id => id.toString() !== itemIdString
            );

            // Learn the user's interests from specific tags on liked items.
            const specificTags = (item.topicTags || [])
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag && !GENERIC_TAGS.has(tag));

            const existingTopics = new Set(
                (profile.likedTopics || []).map(topic => topic.toLowerCase())
            );

            for (const tag of specificTags) {
                if (!existingTopics.has(tag)) {
                    profile.likedTopics.push(tag);
                    existingTopics.add(tag);
                }
            }
        }

        if (action === 'save') {
            if (!profile.savedItems.some(id => id.toString() === itemIdString)) {
                profile.savedItems.push(item._id);
            }
        }

        if (action === 'unsave') {
            profile.savedItems = profile.savedItems.filter(
                id => id.toString() !== itemIdString
            );
        }

        if (action === 'dismiss') {
            if (!profile.dismissedItems.some(id => id.toString() === itemIdString)) {
                profile.dismissedItems.push(item._id);
            }

            // Avoid keeping contradictory feedback for the same item.
            profile.likedItems = profile.likedItems.filter(
                id => id.toString() !== itemIdString
            );
        }

        await profile.save();

        return res.status(200).json({
            message: 'Feedback recorded successfully.',
            userId: profile.userId,
            action,
            item: {
                id: itemIdString,
                title: item.title
            },
            feedback: {
                likedItems: profile.likedItems.length,
                savedItems: profile.savedItems.length,
                dismissedItems: profile.dismissedItems.length,
                likedTopics: profile.likedTopics
            }
        });
    } catch (error) {
        console.error('Failed to record feedback:', error.message);

        return res.status(500).json({
            error: 'Failed to record feedback.'
        });
    }
});

module.exports = router;
