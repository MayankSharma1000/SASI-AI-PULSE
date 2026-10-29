require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');

const {
    cosineSimilarity,
    getItemText
} = require('./src/services/clusteringService');

const THRESHOLDS = [0.40, 0.50, 0.60, 0.70];

const strategies = {
    titleOnly: item => item.title || '',

    currentWeightedTitle: item => getItemText(item),

    titleAndSummary: item =>
        `${item.title || ''} ${item.summary || ''}`
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const items = await Item.find({ type: 'news' })
            .select('title summary topicTags')
            .lean();

        console.log(`News items: ${items.length}`);
        console.log(`Possible pairs: ${items.length * (items.length - 1) / 2}`);

        for (const [strategyName, getText] of Object.entries(strategies)) {
            const counts = Object.fromEntries(
                THRESHOLDS.map(threshold => [threshold, 0])
            );

            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const similarity = cosineSimilarity(
                        getText(items[i]),
                        getText(items[j])
                    );

                    for (const threshold of THRESHOLDS) {
                        if (similarity >= threshold) {
                            counts[threshold]++;
                        }
                    }
                }
            }

            console.log(`\n${strategyName}`);
            console.table(
                THRESHOLDS.map(threshold => ({
                    threshold,
                    matchingPairs: counts[threshold]
                }))
            );
        }
    } catch (error) {
        console.error('Comparison failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

run();
