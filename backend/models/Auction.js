const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        winnerName: {
            type: String,
            required: true
        },

        winningBid: {
            type: Number,
            required: true
        },

        auctionDate: {
            type: Date,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        photoUrl: {
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
    mongoose.model("Auction", auctionSchema);