const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        event: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        imageUrl: {
            type: String,
            required: true
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

module.exports = mongoose.model("Photo", photoSchema);