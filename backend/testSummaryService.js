require('dotenv').config();

const mongoose = require('mongoose');
const { summarizePendingItems } = require('./src/services/summaryService');

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected.');

        const stats = await summarizePendingItems(3);
        console.log('\nSummary results:', stats);
    }
    catch (error) {
        console.error('Summary test failed:', error.message);
        process.exitCode = 1;
    }
    finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

runTest();
