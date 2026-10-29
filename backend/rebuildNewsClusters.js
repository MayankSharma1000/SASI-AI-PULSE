require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const Cluster = require('./src/models/Cluster');

const {
    findSimilarItems
} = require('./src/services/clusteringService');

const NEWS_THRESHOLD = 0.50;

const rebuildNewsClusters = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const newsItems = await Item.find({ type: 'news' })
            .select('_id type title summary topicTags clusterId publishedAt')
            .sort({ publishedAt: 1, _id: 1 })
            .lean();

        console.log(`Found ${newsItems.length} news items`);

        if (newsItems.length === 0) {
            console.log('No news items found.');
            return;
        }

        // Build fresh news clusters without touching paper clusters.
        const createdClusters = [];
        const assignments = new Map();

        for (const item of newsItems) {
            const candidates = createdClusters
                .map(cluster => ({
                    item: cluster.representative,
                    clusterId: cluster.clusterId
                }));

            const matches = findSimilarItems(
                item,
                candidates.map(candidate => candidate.item),
                NEWS_THRESHOLD
            );

            if (matches.length > 0) {
                const bestMatch = matches[0].item;

                const matchedCluster = createdClusters.find(
                    cluster =>
                        String(cluster.representative._id) ===
                        String(bestMatch._id)
                );

                if (matchedCluster) {
                    assignments.set(
                        String(item._id),
                        matchedCluster.clusterId
                    );
                    continue;
                }
            }

            const cluster = await Cluster.create({
                label: item.title,
                type: 'news',
                itemCount: 1,
                representativeItem: item._id
            });

            createdClusters.push({
                clusterId: cluster._id,
                representative: item
            });

            assignments.set(String(item._id), cluster._id);
        }

        // Update each news item's cluster assignment.
        for (const [itemId, clusterId] of assignments.entries()) {
            await Item.updateOne(
                { _id: itemId, type: 'news' },
                { $set: { clusterId } }
            );
        }

        // Recalculate cluster counts from actual assignments.
        const counts = await Item.aggregate([
            {
                $match: {
                    type: 'news',
                    clusterId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$clusterId',
                    count: { $sum: 1 }
                }
            }
        ]);

        for (const entry of counts) {
            await Cluster.updateOne(
                { _id: entry._id, type: 'news' },
                { $set: { itemCount: entry.count } }
            );
        }

        // Delete only obsolete news clusters.
        const activeClusterIds = counts.map(entry => entry._id);

        await Cluster.deleteMany({
            type: 'news',
            _id: { $nin: activeClusterIds }
        });

        console.log('\nNews clustering rebuild complete');
        console.log({
            totalNewsItems: newsItems.length,
            clustersCreated: createdClusters.length,
            multiItemClusters: counts.filter(
                entry => entry.count > 1
            ).length,
            largestCluster: Math.max(
                0,
                ...counts.map(entry => entry.count)
            )
        });
    } catch (error) {
        console.error('News clustering rebuild failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

rebuildNewsClusters();
