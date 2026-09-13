const mongoose = require("mongoose");

const nimajjanamSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        time: {
            type: String,
            required: true
        },

        location: {
            type: String,
            required: true
        },

        photoUrl: {
            type: String,
            default: ""
        },

        description: {
            type: String,
            default: ""
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Nimajjanam",
    nimajjanamSchema
);