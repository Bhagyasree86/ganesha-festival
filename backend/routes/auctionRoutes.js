const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const Auction = require("../models/Auction");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// =====================================================
// MULTER MEMORY STORAGE
// =====================================================

const storage = multer.memoryStorage();


// =====================================================
// PHOTO UPLOAD CONFIGURATION
// =====================================================

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

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only image files are allowed."
                )
            );
        }
    }
});


// =====================================================
// UPLOAD IMAGE TO CLOUDINARY
// =====================================================

function uploadToCloudinary(buffer) {

    return new Promise((resolve, reject) => {

        const stream =
            cloudinary.uploader.upload_stream(
                {
                    folder:
                        "sri-durgamamba-youth/auction",

                    resource_type:
                        "image"
                },

                function (error, result) {

                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

        Readable
            .from(buffer)
            .pipe(stream);
    });
}


// =====================================================
// ADD AUCTION
// =====================================================

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


            // =================================================
            // CHECK REQUIRED FIELDS
            // =================================================

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


            // =================================================
            // UPLOAD PHOTO TO CLOUDINARY
            // =================================================

            let photoUrl = "";

            if (req.file) {

                console.log(
                    "Uploading auction photo to Cloudinary..."
                );

                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                photoUrl =
                    result.secure_url;

                console.log(
                    "Auction photo uploaded successfully:",
                    photoUrl
                );
            }


            // =================================================
            // CREATE AUCTION RECORD
            // =================================================

            const auction =
                new Auction({

                    festivalYear:
                        Number(festivalYear),

                    winnerName:
                        winnerName,

                    winningBid:
                        Number(winningBid),

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


            // =================================================
            // RESPONSE
            // =================================================

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


// =====================================================
// GET ALL AUCTIONS
// =====================================================

router.get(
    "/",

    async (req, res) => {

        try {

            const filter = {};


            // =================================================
            // FILTER BY FESTIVAL YEAR
            // =================================================

            if (req.query.festivalYear) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );
            }


            // =================================================
            // FETCH AUCTIONS
            // =================================================

            const auctions =
                await Auction
                    .find(filter)
                    .populate(
                        "uploadedBy",
                        "name email"
                    )
                    .sort({
                        festivalYear: -1,
                        auctionDate: -1
                    });


            res.json(auctions);

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


// =====================================================
// GET SINGLE AUCTION
// =====================================================

router.get(
    "/:id",

    async (req, res) => {

        try {

            const auction =
                await Auction
                    .findById(
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


            res.json(auction);

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


// =====================================================
// DELETE AUCTION
// =====================================================

router.delete(
    "/:id",

    authMiddleware,

    async (req, res) => {

        try {

            // =================================================
            // FIND AUCTION
            // =================================================

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


            // =================================================
            // DELETE CLOUDINARY IMAGE
            // =================================================

            if (
                auction.photoUrl &&
                auction.photoUrl.includes(
                    "cloudinary.com"
                )
            ) {

                try {

                    const url =
                        auction.photoUrl;

                    const uploadIndex =
                        url.indexOf("/upload/");


                    if (uploadIndex !== -1) {

                        let publicId =
                            url.substring(
                                uploadIndex + 8
                            );


                        // =====================================
                        // REMOVE TRANSFORMATION PARTS
                        // =====================================

                        if (publicId.includes("/")) {

                            const parts =
                                publicId.split("/");

                            // Keep version + folder + filename
                            // while removing transformation
                            if (
                                parts[0] &&
                                parts[0].startsWith("v")
                            ) {

                                publicId =
                                    parts.slice(1).join("/");
                            }
                        }


                        // =====================================
                        // REMOVE VERSION
                        // =====================================

                        publicId =
                            publicId.replace(
                                /^v\d+\//,
                                ""
                            );


                        // =====================================
                        // REMOVE FILE EXTENSION
                        // =====================================

                        publicId =
                            publicId.replace(
                                /\.[^/.]+$/,
                                ""
                            );


                        // =====================================
                        // DELETE FROM CLOUDINARY
                        // =====================================

                        await cloudinary
                            .uploader
                            .destroy(
                                publicId,
                                {
                                    resource_type:
                                        "image"
                                }
                            );


                        console.log(
                            "Auction image deleted from Cloudinary:",
                            publicId
                        );
                    }

                }

                catch (cloudinaryError) {

                    console.log(
                        "Cloudinary delete error:",
                        cloudinaryError.message
                    );

                    // Do not stop database deletion
                }
            }


            // =================================================
            // DELETE DATABASE RECORD
            // =================================================

            await Auction.findByIdAndDelete(
                req.params.id
            );


            // =================================================
            // RESPONSE
            // =================================================

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


// =====================================================
// MULTER ERROR HANDLER
// =====================================================

router.use(
    function (error, req, res, next) {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    message:
                        "Photo size must be less than 10 MB"
                });
            }
        }


        if (error) {

            return res.status(400).json({

                message:
                    error.message
            });
        }


        next();
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;