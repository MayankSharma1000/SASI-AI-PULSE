require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const Cluster = require('./src/models/Cluster');

const {
    findSimilarItems
} = require('./src/services/clusteringService');

const THRESHOLD = 0.50;

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Fetch real news items from the database.
        const newsItems = await Item.find({ type: 'news' })
            .select('_id title summary source topicTags clusterId')
            .sort({ publishedAt: -1 })
            .lean();

        console.log(`News items found: ${newsItems.length}`);

        if (newsItems.length < 2) {
            console.log('Not enough news items to compare.');
            return;
        }

        // Compare each item against other news items.
        const results = [];
        const seenPairs = new Set();

        for (const item of newsItems) {
            const candidates = newsItems.filter(
                candidate =>
                    String(candidate._id) !== String(item._id)
            );

            const matches = findSimilarItems(
                item,
                candidates,
                THRESHOLD
            );

            for (const match of matches) {
                const ids = [
                    String(item._id),
                    String(match.item._id)
                ].sort();

                const pairKey = ids.join(':');

                if (seenPairs.has(pairKey)) {
                    continue;
                }

                seenPairs.add(pairKey);

                results.push({
                    similarity: match.similarity,
                    titleA: item.title,
                    titleB: match.item.title,
                    sameCluster:
                        String(item.clusterId) ===
                        String(match.item.clusterId)
                });
            }
        }

        results.sort((a, b) => b.similarity - a.similarity);

        console.log('\n--- Top Similar News Pairs ---\n');

        for (const result of results.slice(0, 15)) {
            console.log({
                similarity: Number(result.similarity.toFixed(3)),
                sameCluster: result.sameCluster,
                titleA: result.titleA,
                titleB: result.titleB
            });
        }

        console.log('\n--- Summary ---');
        console.log({
            newsItems: newsItems.length,
            similarPairsFound: results.length,
            pairsAlreadyInSameCluster:
                results.filter(result => result.sameCluster).length,
            pairsInDifferentClusters:
                results.filter(result => !result.sameCluster).length
        });

        // Show current cluster counts.
        const clusterSummary = await Item.aggregate([
            { $match: { type: 'news', clusterId: { $ne: null } } },
            {
                $group: {
                    _id: '$clusterId',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalClusters: { $sum: 1 },
                    multiItemClusters: {
                        $sum: {
                            $cond: [{ $gt: ['$count', 1] }, 1, 0]
                        }
                    },
                    largestCluster: { $max: '$count' }
                }
            }
        ]);

        console.log('\n--- Current Database Clusters ---');
        console.log(clusterSummary[0] || 'No news clusters found');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
