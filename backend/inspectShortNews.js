require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');

async function inspectShortNews() {
try {
await mongoose.connect(process.env.MONGODB_URI);

    const items = await Item.find({
        type: 'news',
        rawText: { $exists: true, $ne: '' }
    })
        .sort({ publishedAt: -1 })
        .select('title source url rawText summary publishedAt')
        .lean();
    const shortItems = items.filter(item =>
        item.rawText.trim().split(/\s+/).filter(Boolean).length < 40
    );
    console.log(`Found ${shortItems.length} news items with fewer than 40 words.\n`);
    for (const item of shortItems.slice(0, 5)) {
        const wordCount = item.rawText
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;
        console.log({
            title: item.title,
            source: item.source,
            url: item.url,
            wordCount,
            rawText: item.rawText,
            hasSummary: Boolean(item.summary)
        });
        console.log('-------------------------');
    }
} catch (error) {
    console.error('Inspection failed:', error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}

}

inspectShortNews();
