const express = require("express");

const Auction = require("../models/Auction");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

const router = express.Router();


// ===============================
// MULTER PHOTO UPLOAD
// ===============================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            path.join(__dirname, "../uploads")
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            file.originalname.replace(/\s+/g, "-");

        cb(
            null,
            uniqueName
        );

    }

});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const allowedTypes = [

            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp"

        ];


        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            cb(
                null,
                true
            );

        }
        else {

            cb(
                new Error(
                    "Only image files are allowed."
                )
            );

        }

    }

});


// ===============================
// ADD AUCTION
// ===============================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),

    async (req, res) => {

        try {

            const {
                festivalYear,
                winnerName,
                winningBid,
                auctionDate,
                description
            } = req.body;


            // Check required fields

            if (
                !festivalYear ||
                !winnerName ||
                !winningBid ||
                !auctionDate
            ) {

                return res.status(400).json({

                    message:
                        "Please enter all required auction details."

                });

            }


            // ===============================
            // PHOTO URL
            // ===============================

            let photoUrl = "";


            if (req.file) {

                photoUrl =
                    "/uploads/" +
                    req.file.filename;

            }


            // ===============================
            // CREATE AUCTION
            // ===============================

            const auction =
                new Auction({

                    festivalYear:
                        Number(
                            festivalYear
                        ),

                    winnerName:
                        winnerName,

                    winningBid:
                        Number(
                            winningBid
                        ),

                    auctionDate:
                        auctionDate,

                    description:
                        description || "",

                    photoUrl:
                        photoUrl,

                    uploadedBy:
                        req.user.id

                });


            await auction.save();


            res.status(201).json({

                message:
                    "Auction added successfully!",

                auction:
                    auction

            });

        }


        catch (error) {

            console.log(
                "Add auction error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to add auction.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// GET ALL AUCTIONS
// ===============================

router.get(
    "/",
    async (req, res) => {

        try {

            const filter = {};


            // Filter by festival year

            if (
                req.query.festivalYear
            ) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );

            }


            const auctions =
                await Auction.find(
                    filter
                )
                .populate(
                    "uploadedBy",
                    "name email"
                )
                .sort({

                    festivalYear:
                        -1,

                    auctionDate:
                        -1

                });


            res.json(
                auctions
            );

        }


        catch (error) {

            console.log(
                "Get auctions error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch auctions.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// GET SINGLE AUCTION
// ===============================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const auction =
                await Auction.findById(
                    req.params.id
                )
                .populate(
                    "uploadedBy",
                    "name email"
                );


            if (!auction) {

                return res.status(404).json({

                    message:
                        "Auction not found."

                });

            }


            res.json(
                auction
            );

        }


        catch (error) {

            console.log(
                "Get auction error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch auction.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// DELETE AUCTION
// ===============================

router.delete(
    "/:id",
    authMiddleware,

    async (req, res) => {

        try {

            const auction =
                await Auction.findById(
                    req.params.id
                );


            if (!auction) {

                return res.status(404).json({

                    message:
                        "Auction not found."

                });

            }


            await Auction.findByIdAndDelete(
                req.params.id
            );


            res.json({

                message:
                    "Auction deleted successfully!"

            });

        }


        catch (error) {

            console.log(
                "Delete auction error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to delete auction.",

                error:
                    error.message

            });

        }

    }
);


module.exports = router;