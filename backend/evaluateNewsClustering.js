require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Item = require('./src/models/Item');
const {
    cosineSimilarity,
    getItemText
} = require('./src/services/clusteringService');

const THRESHOLDS = [0.40, 0.45, 0.50, 0.55, 0.60];
const MIN_REVIEW_PAIRS = 100;

const escapeCSV = (value) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
};

const getPairKey = (itemA, itemB) =>
    [String(itemA._id), String(itemB._id)].sort().join(':');

const runEvaluation = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing from your environment.');
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Connected to MongoDB.');

        const items = await Item.find({ type: 'news' })
            .select('_id title summary source publishedAt topicTags clusterId')
            .sort({ publishedAt: -1 })
            .lean();

        console.log(`News items loaded: ${items.length}`);

        if (items.length < 2) {
            console.log('At least two news items are required.');
            return;
        }

        const pairs = [];
        const seen = new Set();

        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i];
                const b = items[j];

                const pairKey = getPairKey(a, b);

                if (seen.has(pairKey)) continue;
                seen.add(pairKey);

                const similarity = cosineSimilarity(
                    getItemText(a),
                    getItemText(b)
                );

                const normalizedTitleA = (a.title || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();

                const normalizedTitleB = (b.title || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();

                const exactTitleDuplicate =
                    normalizedTitleA.length > 0 &&
                    normalizedTitleA === normalizedTitleB;

                const meetsThresholds = THRESHOLDS
                    .filter(threshold => similarity >= threshold)
                    .map(threshold => threshold.toFixed(2))
                    .join('; ');

                pairs.push({
                    a,
                    b,
                    similarity,
                    exactTitleDuplicate,
                    meetsThresholds
                });
            }
        }

        pairs.sort((a, b) => b.similarity - a.similarity);

        // Include high-similarity pairs, exact-title duplicates,
        // and a sample of lower-similarity pairs for manual review.
        const exactDuplicates = pairs.filter(
            pair => pair.exactTitleDuplicate
        );

        const highSimilarity = pairs.filter(
            pair => pair.similarity >= 0.40
        );

        const lowerSimilarity = pairs.filter(
            pair => pair.similarity < 0.40
        );

        const selected = [];
        const selectedKeys = new Set();

        const addPair = pair => {
            const key = getPairKey(pair.a, pair.b);

            if (selectedKeys.has(key)) return;

            selectedKeys.add(key);
            selected.push(pair);
        };

        exactDuplicates.forEach(addPair);
        highSimilarity.forEach(addPair);

        // Deterministically sample lower-similarity pairs across the list.
        const remaining = Math.max(
            0,
            MIN_REVIEW_PAIRS - selected.length
        );

        if (remaining > 0 && lowerSimilarity.length > 0) {
            const sampleCount = Math.min(
                remaining,
                lowerSimilarity.length
            );

            for (let i = 0; i < sampleCount; i++) {
                const index = Math.floor(
                    i * lowerSimilarity.length / sampleCount
                );

                addPair(lowerSimilarity[index]);
            }
        }

        const headers = [
            'item_id_a',
            'item_id_b',
            'title_a',
            'title_b',
            'source_a',
            'source_b',
            'published_at_a',
            'published_at_b',
            'similarity',
            'exact_title_duplicate',
            'thresholds_matched',
            'cluster_id_a',
            'cluster_id_b',
            'same_existing_cluster',
            'manual_label',
            'review_notes'
        ];

        const rows = selected.map(pair => {
            const a = pair.a;
            const b = pair.b;

            return [
                a._id,
                b._id,
                a.title,
                b.title,
                a.source,
                b.source,
                a.publishedAt?.toISOString?.() || '',
                b.publishedAt?.toISOString?.() || '',
                pair.similarity.toFixed(4),
                pair.exactTitleDuplicate,
                pair.meetsThresholds,
                a.clusterId || '',
                b.clusterId || '',
                Boolean(
                    a.clusterId &&
                    b.clusterId &&
                    String(a.clusterId) === String(b.clusterId)
                ),
                '',
                ''
            ].map(escapeCSV).join(',');
        });

        const csv = [
            headers.map(escapeCSV).join(','),
            ...rows
        ].join('\n');

        const outputPath = path.join(
            __dirname,
            'news-clustering-review.csv'
        );

        fs.writeFileSync(outputPath, csv, 'utf8');

        console.log('\n--- Evaluation Results ---');
        console.log({
            newsItems: items.length,
            possiblePairs: pairs.length,
            exactTitleDuplicates: exactDuplicates.length,
            pairsAtOrAbove040: highSimilarity.length,
            reviewPairsExported: selected.length,
            thresholds: THRESHOLDS
        });

        console.log(`\nCSV written to: ${outputPath}`);
        console.log('\nManual label options:');
        console.log('same_event');
        console.log('related_but_different');
        console.log('unrelated');
        console.log(
            '\nFill in manual_label and review_notes for the reviewed pairs.'
        );
    } catch (error) {
        console.error('Evaluation failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

runEvaluation();
