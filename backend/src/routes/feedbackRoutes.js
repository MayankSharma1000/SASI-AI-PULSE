const express = require('express');
const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const Item = require('../models/Item');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_ACTIONS = ['like', 'unlike', 'save', 'unsave', 'dismiss', 'undismiss'];

const GENERIC_TAGS = new Set([
    'ai',
    'industry-news',
    'technology',
    'news'
]);

// POST /api/feedback. Identity comes from the authenticated session, never the request body.
router.post('/', requireAuth, async (req, res) => {
    try {
        const { itemId, action } = req.body;
        const userId = req.auth.profileId;

        // 1. Validate request
        if (!itemId || !action) {
            return res.status(400).json({ error: 'itemId and action are required.' });
        }

        if (!mongoose.isValidObjectId(itemId)) {
            return res.status(400).json({
                error: 'Invalid itemId.'
            });
        }

        if (!VALID_ACTIONS.includes(action)) {
            return res.status(400).json({
                error: 'Invalid action. Use like, unlike, save, unsave, dismiss, or undismiss.'
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

        if (action === 'unlike') {
            profile.likedItems = profile.likedItems.filter(
                id => id.toString() !== itemIdString
            );

            // Rebuild learned topics from the items that remain liked, so
            // removing a like also removes topics learned only from that item.
            const remainingLikedItems = await Item.find({
                _id: { $in: profile.likedItems }
            }).select('topicTags').lean();
            const learnedTopics = new Set();
            for (const likedItem of remainingLikedItems) {
                for (const tag of likedItem.topicTags || []) {
                    const normalized = tag.trim().toLowerCase();
                    if (normalized && !GENERIC_TAGS.has(normalized)) learnedTopics.add(normalized);
                }
            }
            profile.likedTopics = [...learnedTopics];
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

        if (action === 'undismiss') {
            profile.dismissedItems = profile.dismissedItems.filter(
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


// GET /api/feedback/saved
// Return the authenticated user's saved items from MongoDB.
router.get('/saved', requireAuth, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({
            userId: req.auth.profileId
        }).select('savedItems').lean();

        if (!profile) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        const items = profile.savedItems?.length
            ? await Item.find({ _id: { $in: profile.savedItems } })
                .select('-embedding -rawText')
                .lean()
            : [];

        const savedOrder = new Map(
            (profile.savedItems || []).map((id, index) => [String(id), index])
        );

        items.sort((a, b) =>
            (savedOrder.get(String(a._id)) ?? 0) -
            (savedOrder.get(String(b._id)) ?? 0)
        );

        return res.json({
            count: items.length,
            items
        });
    } catch (error) {
        console.error('Failed to retrieve saved items:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve saved items.' });
    }
});


// Shared helper: return a user's feedback items in their original order.
async function getFeedbackItems(userId, field, res) {
    const profile = await UserProfile.findOne({ userId }).select(field).lean();

    if (!profile) {
        return res.status(404).json({ error: 'User profile not found.' });
    }

    const ids = profile[field] || [];
    const items = ids.length
        ? await Item.find({ _id: { $in: ids } })
            .select('-embedding -rawText')
            .lean()
        : [];

    const order = new Map(ids.map((id, index) => [String(id), index]));
    items.sort((a, b) =>
        (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0)
    );

    return res.json({ count: items.length, items });
}

// GET /api/feedback/liked
router.get('/liked', requireAuth, async (req, res) => {
    try {
        return await getFeedbackItems(req.auth.profileId, 'likedItems', res);
    } catch (error) {
        console.error('Failed to retrieve liked items:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve liked items.' });
    }
});

// GET /api/feedback/dismissed
router.get('/dismissed', requireAuth, async (req, res) => {
    try {
        return await getFeedbackItems(req.auth.profileId, 'dismissedItems', res);
    } catch (error) {
        console.error('Failed to retrieve dismissed items:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve dismissed items.' });
    }
});

module.exports = router;
