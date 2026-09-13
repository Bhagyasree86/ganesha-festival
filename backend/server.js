const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

// Routes
const authRoutes = require("./routes/auth");
const photoRoutes = require("./routes/photoRoutes");
const eventRoutes = require("./routes/eventRoutes");
const videoRoutes = require("./routes/videoRoutes");
const auctionRoutes = require("./routes/auctionRoutes");
const nimajjanamRoutes = require("./routes/nimajjanamRoutes");
const sponsorRoutes = require("./routes/sponsorRoutes");
const committeeRoutes = require("./routes/committeeRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/nimajjanam", nimajjanamRoutes);
app.use("/api/sponsors", sponsorRoutes);
app.use("/api/committee", committeeRoutes);

// Uploaded files
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// Test route
app.get("/", (req, res) => {
    res.send("Ganesha Festival Backend is Running!");
});

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log("MongoDB Connected");

        app.listen(
            process.env.PORT || 5000,
            () => {

                console.log(
                    `Server running on port ${process.env.PORT || 5000}`
                );

            }
        );

    })
    .catch((error) => {

        console.log(
            "MongoDB connection error:",
            error
        );

    });