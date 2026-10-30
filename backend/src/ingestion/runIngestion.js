require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/database');

const ingestArxivPapers = require('./arxivIngestion');
const ingestNews = require('./newsIngestion');
const {
    summarizePendingItems
} = require('../services/summaryService');

const ARXIV_CATEGORIES = [
    'cs.AI',
    'cs.LG',
    'cs.CL',
    'cs.CV',
    'cs.MA',
    'cs.RO',
    'cs.CY',
    'stat.ML'
];

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

const withRetries = async (
    operation,
    label,
    maxAttempts = 3
) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(
                `[${new Date().toISOString()}] ${label}: attempt ${attempt}/${maxAttempts}`
            );

            return await operation();
        } catch (error) {
            lastError = error;

            console.error(
                `[${new Date().toISOString()}] ${label} failed:`,
                error.message
            );

            if (attempt < maxAttempts) {
                await sleep(attempt * 2000);
            }
        }
    }

    throw lastError;
};

const runIngestion = async () => {
    if (runIngestion.isRunning) {
        console.log(
            `[${new Date().toISOString()}] Skipping ingestion: another run is active.`
        );

        return { skipped: true };
    }

    runIngestion.isRunning = true;

    const startedAt = Date.now();
    let ownsConnection = false;

    const stats = {
        startedAt: new Date(startedAt).toISOString(),
        completedCategories: [],
        failedCategories: [],
        newsStatus: 'not_started',
        newsResult: null,
        summaryResult: null,
        summaryError: null
    };

    console.log('\n========================================');
    console.log('SASI AI PULSE INGESTION STARTED');
    console.log(stats.startedAt);
    console.log('========================================\n');

    try {
        // 1. Connect to MongoDB.
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
            ownsConnection = true;
        }

        console.log('MongoDB is ready.');

        // 2. Ingest papers from each arXiv category.
        for (const category of ARXIV_CATEGORIES) {
            try {
                await withRetries(
                    () => ingestArxivPapers(category),
                    `arXiv ${category}`
                );

                stats.completedCategories.push(category);
            } catch (error) {
                stats.failedCategories.push({
                    category,
                    error: error.message
                });

                console.error(
                    `Giving up on arXiv category ${category}.`
                );
            }
        }

        // 3. Ingest industry news.
        // Do not retry the entire news ingestion just because
        // individual articles failed. ingestNews already tracks failures.
        try {
            stats.newsResult = await withRetries(
                async () => {
                    const result = await ingestNews();

                    // Source-level failures are reported in the result.
                    // Individual failures should not trigger a complete
                    // rerun of all eight news sources.
                    return result;
                },
                'News ingestion'
            );

            stats.newsStatus =
                stats.newsResult.failed > 0
                    ? 'completed_with_errors'
                    : 'completed';
        } catch (error) {
            stats.newsStatus = 'failed';
            stats.newsError = error.message;

            console.error(
                'News ingestion could not complete:',
                error.message
            );
        }

        // 4. Generate summaries for pending news items.
        // Summary failures must not prevent ingestion statistics
        // from being recorded.
        try {
            console.log('\nStarting pending news summaries...');

            stats.summaryResult = await summarizePendingItems(10);

            console.log(
                'Summary generation result:',
                JSON.stringify(stats.summaryResult, null, 2)
            );
        } catch (error) {
            stats.summaryError = error.message;

            console.error(
                'Summary generation failed:',
                error.message
            );
        }

        // 5. Record final statistics.
        stats.durationSeconds = Number(
            ((Date.now() - startedAt) / 1000).toFixed(2)
        );

        stats.completedAt = new Date().toISOString();

        console.log('\n========================================');
        console.log('SASI AI PULSE INGESTION FINISHED');
        console.log(JSON.stringify(stats, null, 2));
        console.log('========================================\n');

        return stats;
    } catch (error) {
        stats.fatalError = error.message;

        console.error(
            'Fatal ingestion error:',
            error
        );

        throw error;
    } finally {
        runIngestion.isRunning = false;

        if (
            ownsConnection &&
            mongoose.connection.readyState !== 0
        ) {
            await mongoose.disconnect();

            console.log('MongoDB connection closed.');
        }
    }
};

runIngestion.isRunning = false;

module.exports = runIngestion;
