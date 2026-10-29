const Item = require('../models/Item');
const Cluster = require('../models/Cluster');
const { findSimilarItems } = require('./clusteringService');

const SIMILARITY_THRESHOLDS = {
    news: 0.40,
    paper: 0.75
};

const MAX_CANDIDATES = 500;

const assignCluster = async (itemId) => {
    const item = await Item.findById(itemId);

    if (!item) {
        throw new Error(`Item not found: ${itemId}`);
    }

    const previousClusterId = item.clusterId
        ? String(item.clusterId)
        : null;

    const threshold = SIMILARITY_THRESHOLDS[item.type] ?? 0.75;

    const clusters = await Cluster.find({
        type: item.type,
        representativeItem: { $ne: null },
        ...(previousClusterId
            ? { _id: { $ne: previousClusterId } }
            : {})
    })
        .sort({ createdAt: -1 })
        .limit(MAX_CANDIDATES)
        .select('_id representativeItem')
        .lean();

    const representativeIds = clusters
        .map(cluster => cluster.representativeItem)
        .filter(Boolean);

    const representatives = representativeIds.length
        ? await Item.find({
            _id: { $in: representativeIds },
            type: item.type,
            clusterId: { $ne: null },
            _id: { $ne: item._id }
        })
            .select('_id type title summary topicTags clusterId')
            .lean()
        : [];

    const matches = findSimilarItems(item, representatives, threshold);

    let targetClusterId;

    if (matches.length) {
        targetClusterId = matches[0].item.clusterId;
    } else if (previousClusterId) {
        // Keep the existing assignment when no better match is found.
        return item;
    } else {
        const cluster = await Cluster.create({
            label: item.title,
            type: item.type,
            itemCount: 0,
            representativeItem: item._id
        });

        targetClusterId = cluster._id;
    }

    if (previousClusterId === String(targetClusterId)) {
        return item;
    }

    // Move the item first. If this fails, don't alter cluster counts.
    const updatedItem = await Item.findOneAndUpdate(
        previousClusterId
            ? { _id: item._id, clusterId: item.clusterId }
            : {
                _id: item._id,
                $or: [
                    { clusterId: null },
                    { clusterId: { $exists: false } }
                ]
            },
        { $set: { clusterId: targetClusterId } },
        { new: true }
    );

    if (!updatedItem) {
        throw new Error(`Item changed during clustering: ${itemId}`);
    }

    // Update the destination cluster count from actual database contents.
    const targetCount = await Item.countDocuments({
        clusterId: targetClusterId
    });

    await Cluster.updateOne(
        { _id: targetClusterId },
        { $set: { itemCount: targetCount } }
    );

    if (previousClusterId) {
        const oldCount = await Item.countDocuments({
            clusterId: item.clusterId
        });

        if (oldCount === 0) {
            await Cluster.deleteOne({ _id: item.clusterId });
        } else {
            const oldCluster = await Cluster.findById(item.clusterId);

            if (oldCluster) {
                oldCluster.itemCount = oldCount;

                if (String(oldCluster.representativeItem) === String(item._id)) {
                    const replacement = await Item.findOne({
                        clusterId: item.clusterId
                    }).select('_id title');

                    if (replacement) {
                        oldCluster.representativeItem = replacement._id;
                        oldCluster.label = replacement.title;
                    }
                }

                await oldCluster.save();
            }
        }
    }

    return updatedItem;
};

module.exports = {
    assignCluster,
    SIMILARITY_THRESHOLDS,
    MAX_CANDIDATES
};
