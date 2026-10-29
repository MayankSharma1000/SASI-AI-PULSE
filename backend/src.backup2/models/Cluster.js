const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['paper', 'news'],
            required: true
        },
        itemCount: {
            type: Number,
            default: 0
        },
        representativeItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Cluster', clusterSchema);
