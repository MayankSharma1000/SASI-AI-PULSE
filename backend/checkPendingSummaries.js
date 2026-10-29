require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');

async function checkPendingSummaries() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected.\n");

            const pendingFilter = {
                rawText: { $exists: true, $ne: '' },
                $or: [
                    { summary: { $exists: false } },
                    { summary: '' },
                    { summary: null }
                ]
            };
            const [total, papers, news] = await Promise.all([
                Item.countDocuments(pendingFilter),
                Item.countDocuments({ ...pendingFilter, type: 'paper' }),
                Item.countDocuments({ ...pendingFilter, type: 'news' })
            ]);
            console.log('Pending summary report:');
            console.log('-----------------------');
            console.log(`Total:  ${total}`);
            console.log(`Papers: ${papers}`);
            console.log(`News:   ${news}`);
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exitCode = 1;
    }
    finally {
        await mongoose.disconnect();
    }

}

checkPendingSummaries();
