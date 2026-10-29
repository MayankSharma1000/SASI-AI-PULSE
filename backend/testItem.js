require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Item = require('./src/models/Item');

const testItem = async() => {
    try{
        await connectDB;

        const paper = await Item.create({
            type: 'paper',
            externalId: 'arxiv-test-001',
            title: 'Testing SASI AI Pulse',
            source: 'arXiv',
            authors: ['Test Author'],
            publishedAt: new Date(),
            url: 'https://arxiv.org/abs/2601.00001',
            rawText: 'This is a test research paper.',
            topicTags: ['cs.AI', 'cs.LG']
        });

        console.log('Saved item: ', paper._id);

        const savedItem = await Item.findById(paper._id);
        console.log('Retrieved item:', savedItem.title)
    }
    catch(error){
        console.error('Test failed:', error.message);
        process.exitCode = 1;
    }
    finally{
        await mongoose.disconnect();
    }
};

testItem();
