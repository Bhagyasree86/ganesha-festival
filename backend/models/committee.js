const mongoose = require("mongoose");

const committeeSchema = new mongoose.Schema(
    {
        festivalYear: {
            type: Number,
            required: true
        },

        memberName: {
            type: String,
            required: true
        },

        role: {
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

module.exports =
    mongoose.model("Committee", committeeSchema);