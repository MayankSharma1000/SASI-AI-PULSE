require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');

const {
    cosineSimilarity,
    getItemText
} = require('./src/services/clusteringService');

const THRESHOLD = 0.40;

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
            .select('title summary source publishedAt topicTags')
            .sort({ publishedAt: -1 })
            .lean();

        for (const [name, getText] of Object.entries(strategies)) {
            const matches = [];

            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const similarity = cosineSimilarity(
                        getText(items[i]),
                        getText(items[j])
                    );

                    if (similarity >= THRESHOLD) {
                        matches.push({
                            similarity: Number(similarity.toFixed(4)),
                            titleA: items[i].title,
                            titleB: items[j].title,
                            sourceA: items[i].source,
                            sourceB: items[j].source
                        });
                    }
                }
            }

            matches.sort((a, b) => b.similarity - a.similarity);

            console.log(`\n--- ${name} ---`);
            console.table(matches);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

run();
