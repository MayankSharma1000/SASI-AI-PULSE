require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const { rankItems } = require('./src/services/rankingService');

async function testRanking() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected.');

        const items = await Item.find({ type: 'news' })
            .select('-embedding -rawText')
            .lean();

        const profiles = [
            {
                name: 'Browser AI enthusiast',
                interests: ['browser-based ai', 'local inference'],
                likedTopics: [],
                projectDescription: 'AI running locally in browsers'
            },
            {
                name: 'AI productivity enthusiast',
                interests: ['productivity', 'AI assistants'],
                likedTopics: [],
                projectDescription: 'AI tools for office productivity'
            }
        ];
        for (const profile of profiles) {
            const rankedItems = rankItems(items, profile);
            console.log(`\n--- ${profile.name} ---\n`);

            rankedItems.slice(0, 5).forEach((item, index) => {
                console.log(
                    `${index + 1}. [${item.rankingScore}] ${item.title}`
                );
            });
        }
    }
    catch (error) {
        console.error('Ranking test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

testRanking();
