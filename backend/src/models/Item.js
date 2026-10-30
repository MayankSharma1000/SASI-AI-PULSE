const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['paper', 'news'],
            required: true
        },
        externalId: {
            type: String,
            required: true
        },
        title:{
            type: String,
            required: true,
            trim: true
        },
        source: {
            type: String,
            required: true
        },
        authors: {
            type: [String],
            default: []
        },
        publishedAt: {
            type: Date
        },
        url: {
            type: String,
            required: true
        },
        imageUrl: {
            type: String,
            default: ''
        },
        rawText: {
            type: String,
            default: ''
        },
        summary: {
            type: String,
            default: ''
        },
        embedding: {
            type: [Number],
            default: undefined
        },
        topicTags: {
            type: [String],
            default: []
        },
        clusterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cluster',
            default: null
        }
    },

    {
        timestamps: true
    }
);

itemSchema.index(
    {source: 1, externalId: 1},
    {unique: true}
);

module.exports = mongoose.model('Item', itemSchema);
