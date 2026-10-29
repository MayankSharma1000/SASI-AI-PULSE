require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const { extractTopics } = require('./src/services/aiService');

async function testSavedTopics() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const item = await Item.findOne({
            type: 'news',
            title: /Opera introduces a new web standard/i
        });

        if (!item) {
            throw new Error('Opera article was not found.');
        }

        const topics = await extractTopics(
            `${item.title}\n${item.rawText || ''}`
        );

        item.topicTags = [
            ...new Set([
                ...(item.topicTags || []),
                ...topics
            ])
        ];

        await item.save();

        console.log('Article:', item.title);
        console.log('Saved topics:', item.topicTags);
    } catch (error) {
        console.error('Topic test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

testSavedTopics();
