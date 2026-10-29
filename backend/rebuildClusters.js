require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const Cluster = require('./src/models/Cluster');
const { assignCluster } = require('./src/services/clusterAssignmentService');

const rebuildClusters = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove only cluster references from items.
        // Articles, summaries, user profiles and feedback remain untouched.
        const resetResult = await Item.updateMany(
            {},
            { $set: { clusterId: null } }
        );

        console.log(`Reset ${resetResult.modifiedCount} item cluster references`);

        // Remove old cluster metadata so clusters can be rebuilt cleanly.
        const deletedClusters = await Cluster.deleteMany({});
        console.log(`Deleted ${deletedClusters.deletedCount} old cluster records`);

        const items = await Item.find({})
            .select('_id type publishedAt')
            .sort({ publishedAt: 1, _id: 1 })
            .lean();

        console.log(`Rebuilding clusters for ${items.length} items`);

        let processed = 0;
        let failed = 0;

        for (const item of items) {
            try {
                await assignCluster(item._id);
                processed++;

                if (processed % 100 === 0) {
                    console.log(`Processed ${processed}/${items.length} items`);
                }
            } catch (error) {
                failed++;
                console.error(
                    `Failed to cluster item ${item._id}:`,
                    error.message
                );
            }
        }

        // Recalculate counts from actual item assignments.
        const counts = await Item.aggregate([
            { $match: { clusterId: { $ne: null } } },
            {
                $group: {
                    _id: '$clusterId',
                    count: { $sum: 1 }
                }
            }
        ]);

        for (const entry of counts) {
            await Cluster.updateOne(
                { _id: entry._id },
                { $set: { itemCount: entry.count } }
            );
        }

        const clusteredCount = await Item.countDocuments({
            clusterId: { $ne: null }
        });

        const clusterCount = await Cluster.countDocuments();

        console.log('\nRebuild complete');
        console.log({
            totalItems: items.length,
            processed,
            failed,
            clusteredItems: clusteredCount,
            clustersCreated: clusterCount,
            unclusteredItems: items.length - clusteredCount
        });
    } catch (error) {
        console.error('Cluster rebuild failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

rebuildClusters();
