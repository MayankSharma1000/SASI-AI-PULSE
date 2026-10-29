const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: 'AI Explorer',
            trim: true
        },
        goal: {
            type: String,
            default: 'student'
        },
        userId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        interests: {
            type: [String],
            default: []
        },

        projectDescription: {
            type: String,
            default: '',
            trim: true
        },

        likedTopics: {
            type: [String],
            default: []
        },

        likedItems: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item'
            }
        ],

        savedItems: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item'
            }
        ],

        dismissedItems: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item'
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);
