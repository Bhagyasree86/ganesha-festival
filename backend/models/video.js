const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        videoUrl: {
            type: String,
            required: true
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

module.exports = mongoose.model("Video", videoSchema);