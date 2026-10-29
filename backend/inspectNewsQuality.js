require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');

const countWords = (text = '') =>
    text.trim().split(/\s+/).filter(Boolean).length;

async function inspectNewsQuality() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const items = await Item.find({ type: 'news' })
            .select(
                'title source rawText summary topicTags clusterId publishedAt'
            )
            .lean();

        const report = {
            totalNews: items.length,
            emptySourceText: 0,
            shortSourceText: 0,
            missingSummary: 0,
            shortSummary: 0,
            missingTopics: 0,
            missingCluster: 0
        };

        const problemItems = [];

        for (const item of items) {
            const sourceWords = countWords(item.rawText);
            const summaryWords = countWords(item.summary);

            if (sourceWords === 0) {
                report.emptySourceText++;
            }

            if (sourceWords > 0 && sourceWords < 40) {
                report.shortSourceText++;
            }

            if (!item.summary?.trim()) {
                report.missingSummary++;
            } else if (summaryWords < 12) {
                report.shortSummary++;
            }

            if (!item.topicTags?.length) {
                report.missingTopics++;
            }

            if (!item.clusterId) {
                report.missingCluster++;
            }

            if (
                sourceWords < 40 ||
                !item.summary?.trim() ||
                !item.topicTags?.length ||
                !item.clusterId
            ) {
                problemItems.push({
                    title: item.title,
                    source: item.source,
                    sourceWords,
                    summaryWords,
                    topics: item.topicTags || [],
                    hasCluster: Boolean(item.clusterId)
                });
            }
        }

        console.log('\nNEWS QUALITY REPORT');
        console.table(report);

        console.log('\nFIRST 15 ITEMS NEEDING ATTENTION');
        console.table(problemItems.slice(0, 15));
    } catch (error) {
        console.error('Inspection failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

inspectNewsQuality();
