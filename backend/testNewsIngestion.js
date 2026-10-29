require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const ingestNews = require('./src/ingestion/newsIngestion');

const runTest = async () => {
    try {
        await connectDB();

            console.log('\nStarting news ingestion...\n');
            const stats = await ingestNews();
            console.log('\nFinal ingestion statistics:');
            console.table(stats);
    }
    catch (error) {
            console.error('News ingestion test failed:', error.message);
            process.exitCode = 1;
    }
    finally {
        await mongoose.disconnect();
        console.log('\nMongoDB connection closed.');
    }
};

runTest();
