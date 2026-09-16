const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const Sponsor = require("../models/sponsor");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// =====================================================
// MULTER MEMORY STORAGE
// =====================================================

const storage = multer.memoryStorage();


// =====================================================
// FILE UPLOAD CONFIGURATION
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
                    "Only JPG, JPEG, PNG and WebP images are allowed"
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
                        "sri-durgamamba-youth/sponsors",

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
// ADD SPONSOR
// =====================================================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),

    async function (req, res) {

        try {

            const {
                festivalYear,
                sponsorName,
                amount,
                description
            } = req.body;


            // =================================================
            // VALIDATION
            // =================================================

            if (
                !festivalYear ||
                !sponsorName
            ) {

                return res.status(400).json({

                    message:
                        "Festival year and sponsor name are required"
                });
            }


            // =================================================
            // UPLOAD PHOTO TO CLOUDINARY
            // =================================================

            let photoUrl = "";

            if (req.file) {

                console.log(
                    "Uploading sponsor photo to Cloudinary..."
                );

                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                photoUrl =
                    result.secure_url;

                console.log(
                    "Sponsor photo uploaded successfully:",
                    photoUrl
                );
            }


            // =================================================
            // CREATE SPONSOR
            // =================================================

            const sponsor =
                await Sponsor.create({

                    festivalYear:
                        Number(festivalYear),

                    sponsorName:
                        sponsorName,

                    amount:
                        Number(amount) || 0,

                    photoUrl:
                        photoUrl,

                    description:
                        description || "",

                    uploadedBy:
                        req.user.id
                });


            // =================================================
            // RESPONSE
            // =================================================

            res.status(201).json(
                sponsor
            );

        }

        catch (error) {

            console.log(
                "Add sponsor error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to add sponsor",

                error:
                    error.message
            });
        }
    }
);


// =====================================================
// GET ALL SPONSORS
// =====================================================

router.get(
    "/",

    async function (req, res) {

        try {

            const {
                festivalYear
            } = req.query;

            const filter = {};


            // =================================================
            // FILTER BY FESTIVAL YEAR
            // =================================================

            if (festivalYear) {

                filter.festivalYear =
                    Number(festivalYear);
            }


            // =================================================
            // FETCH SPONSORS
            // =================================================

            const sponsors =
                await Sponsor
                    .find(filter)
                    .populate(
                        "uploadedBy",
                        "name email"
                    )
                    .sort({
                        festivalYear: -1,
                        createdAt: -1
                    });


            res.json(
                sponsors
            );

        }

        catch (error) {

            console.log(
                "Get sponsors error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to fetch sponsors",

                error:
                    error.message
            });
        }
    }
);


// =====================================================
// GET SINGLE SPONSOR
// =====================================================

router.get(
    "/:id",

    async function (req, res) {

        try {

            const sponsor =
                await Sponsor.findById(
                    req.params.id
                );


            if (!sponsor) {

                return res.status(404).json({

                    message:
                        "Sponsor not found"
                });
            }


            res.json(
                sponsor
            );

        }

        catch (error) {

            console.log(
                "Get sponsor error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to fetch sponsor",

                error:
                    error.message
            });
        }
    }
);


// =====================================================
// DELETE SPONSOR
// =====================================================

router.delete(
    "/:id",

    authMiddleware,

    async function (req, res) {

        try {

            // =================================================
            // FIND SPONSOR
            // =================================================

            const sponsor =
                await Sponsor.findById(
                    req.params.id
                );


            if (!sponsor) {

                return res.status(404).json({

                    message:
                        "Sponsor not found"
                });
            }


            // =================================================
            // DELETE CLOUDINARY IMAGE
            // =================================================

            if (
                sponsor.photoUrl &&
                sponsor.photoUrl.includes(
                    "cloudinary.com"
                )
            ) {

                try {

                    const url =
                        sponsor.photoUrl;

                    const uploadIndex =
                        url.indexOf("/upload/");


                    if (uploadIndex !== -1) {

                        let publicId =
                            url.substring(
                                uploadIndex + 8
                            );


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
                            "Sponsor image deleted from Cloudinary:",
                            publicId
                        );
                    }

                }

                catch (cloudinaryError) {

                    console.log(
                        "Cloudinary delete error:",
                        cloudinaryError.message
                    );

                    // Continue deleting database record
                }
            }


            // =================================================
            // DELETE DATABASE RECORD
            // =================================================

            await Sponsor.findByIdAndDelete(
                req.params.id
            );


            // =================================================
            // RESPONSE
            // =================================================

            res.json({

                message:
                    "Sponsor deleted successfully"
            });

        }

        catch (error) {

            console.log(
                "Delete sponsor error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to delete sponsor",

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