require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const { summarizeText } = require('./src/services/aiService');

const testRealSummary = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('MongoDB connected.');

        const item = await Item.findOne({
            type: 'paper',
            rawText: { $exists: true, $ne: '' }
        }).select('title source rawText summary');

        if (!item) {
            console.log('No research paper with source text was found.');
            return;
        }

        console.log('\nPaper:', item.title);
        console.log('\nOriginal abstract preview:\n');
        console.log(item.rawText.slice(0, 700));

        const summary = await summarizeText(item.rawText);

        console.log('\nAI-generated summary:\n');
        console.log(summary);

        console.log('\nTest completed. Database record was not modified.');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB connection closed.');
    }
};

testRealSummary();
