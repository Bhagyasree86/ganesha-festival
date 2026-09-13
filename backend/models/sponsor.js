const mongoose = require("mongoose");

const sponsorSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        sponsorName: {
            type: String,
            required: true
        },

        amount: {
            type: Number,
            default: 0
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

module.exports =
    mongoose.model(
        "Sponsor",
        sponsorSchema
    );