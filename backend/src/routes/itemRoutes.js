const express = require('express');
const UserProfile = require('../models/UserProfile');
const Item = require('../models/Item');
const { rankItems } = require('../services/rankingService');

const router = express.Router();

// GET /api/items
// Query parameters:
// userId, type, topic, limit
// interests, likedTopics, projectDescription (optional overrides)
router.get('/', async (req, res) => {
    try {
        // 1. Validate and normalize the requested limit.
        const requestedLimit = Number.parseInt(req.query.limit, 10);

        const limit = Number.isNaN(requestedLimit)
            ? 20
            : Math.min(Math.max(requestedLimit, 1), 50);

        // Fetch enough candidates to fill the feed after deduplication.
        const requestedPage = Number.parseInt(req.query.page, 10);
        const page = Number.isNaN(requestedPage) ? 1 : Math.max(1, requestedPage);
        const candidateLimit = Math.min(Math.max(limit * page * 5, 250), 2000);

        // 2. Build the database filter.
        const filter = {};

        if (req.query.type) {
            if (!['paper', 'news'].includes(req.query.type)) {
                return res.status(400).json({
                    error: 'Invalid type. Use "paper" or "news".'
                });
            }

            filter.type = req.query.type;
        }

        if (req.query.topic) {
            filter.topicTags = req.query.topic;
        }

        // Explore mode ignores personal preferences and dismissed items.
        const exploreMode = req.query.mode === 'explore';

        // 3. Load the saved user profile, if a userId was supplied.
        let profile = {
            interests: [],
            likedTopics: [],
            projectDescription: ''
        };

        let profileSource = 'default';

        if (req.query.userId && !exploreMode) {
            const savedProfile = await UserProfile.findOne({
                userId: req.query.userId
            }).lean();

            if (savedProfile) {
                profile = savedProfile;
                profileSource = 'saved';
            } else {
                return res.status(404).json({
                    error: 'User profile not found.',
                    userId: req.query.userId
                });
            }
        }

        // 4. Allow explicit query parameters to override saved preferences.
        if (req.query.interests !== undefined) {
            profile.interests = req.query.interests
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
        }

        if (req.query.likedTopics !== undefined) {
            profile.likedTopics = req.query.likedTopics
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
        }

        if (req.query.projectDescription !== undefined) {
            profile.projectDescription = req.query.projectDescription;
        }

        // 5. Exclude items dismissed by this user.
        if (!exploreMode && profile.dismissedItems?.length) {
            filter._id = {
                $nin: profile.dismissedItems
            };
        }

        // 6. Fetch a larger pool so deduplication doesn't shrink the feed.
        const items = await Item.find(filter)
            .sort({ publishedAt: -1 })
            .limit(candidateLimit)
            .select('-embedding -rawText')
            .lean();

        // 7. Rank all candidates before deduplicating.
        const rankedItems = rankItems(items, profile);

        // 8. Keep the highest-ranked representative from each cluster.
        // Items without a cluster are kept unless their normalized title
        // matches another item from the same source.
        const seenClusters = new Set();
        const seenSourceTitles = new Set();
        const uniqueItems = [];

        for (const item of rankedItems) {
            if (item.type === 'news' && item.clusterId) {
                const clusterId = String(item.clusterId);

                if (seenClusters.has(clusterId)) {
                    continue;
                }

                seenClusters.add(clusterId);
            } else if (item.type === 'news') {
                const normalizedTitle = (item.title || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();

                const sourceTitleKey =
                    `${item.source || ''}::${normalizedTitle}`;

                if (seenSourceTitles.has(sourceTitleKey)) {
                    continue;
                }

                seenSourceTitles.add(sourceTitleKey);
            }

            uniqueItems.push(item);
        }

        const total = uniqueItems.length;
        const pageItems = uniqueItems.slice((page - 1) * limit, page * limit);

        // 9. Return the personalized, deduplicated feed.
        return res.status(200).json({
            count: pageItems.length,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            filters: {
                userId: req.query.userId || null,
                type: req.query.type || 'all',
                topic: req.query.topic || null,
                limit
            },
            personalization: {
                enabled: !exploreMode,
                mode: exploreMode ? 'explore' : 'personalized',
                profileSource,
                interests: profile.interests || [],
                likedTopics: profile.likedTopics || []
            },
            items: pageItems
        });
    } catch (error) {
        console.error('Failed to fetch items:', error.message);

        return res.status(500).json({
            error: 'Failed to retrieve items'
        });
    }
});

module.exports = router;
