require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const ingestArxivPapers = require('./src/ingestion/arxivIngestion');

const ARXIV_CATEGORIES = [
    'cs.AI'
    // 'cs.LG',
    // 'cs.CL',
    // 'cs.CV',
    // 'cs.MA',
    // 'cs.RO',
    // 'cs.CY',
    // 'stat.ML'
];

const runIngestionTest = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await connectDB();

        console.log('Starting arXiv ingestion test...');

        for (const category of ARXIV_CATEGORIES) {
            console.log(`\nProcessing category: ${category}`);

            await ingestArxivPapers(category);
        }

        console.log('\nAll arXiv categories processed successfully.');
    } catch (error) {
        console.error('Ingestion test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

runIngestionTest();
