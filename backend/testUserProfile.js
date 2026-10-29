require('dotenv').config();

const mongoose = require('mongoose');
const UserProfile = require('./src/models/UserProfile');

async function testUserProfile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const profile = await UserProfile.findOneAndUpdate(
            { userId: 'demo-user-1' },
            {
                $set: {
                    interests: ['browser-based ai', 'machine learning'],
                    projectDescription:
                        'An AI research assistant for students and faculty',
                    likedTopics: ['local inference']
                }
            },
            {
                returnDocument: 'after',
                upsert: true,
                runValidators: true
            }
        );

        console.log('User profile saved successfully:');
        console.log(profile.toObject());
    } catch (error) {
        console.error('User profile test failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

testUserProfile();
