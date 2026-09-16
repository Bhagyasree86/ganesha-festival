const express = require("express");
const multer = require("multer");
const fs = require("fs");

const Video = require("../models/video");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// ======================================================
// MULTER
// Temporarily stores selected video on the server
// Maximum video size: 100 MB
// ======================================================

const upload = multer({

    dest: "uploads/videos/",

    limits: {
        fileSize: 100 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska"
        ];

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only video files are allowed."
                )
            );
        }
    }
});


// ======================================================
// ADD VIDEO
// Committee members only
// ======================================================

router.post(
    "/",
    authMiddleware,
    upload.single("video"),

    async (req, res) => {

        try {

            // ==================================================
            // CHECK WHETHER VIDEO WAS SELECTED
            // ==================================================

            if (!req.file) {

                return res.status(400).json({

                    message:
                        "Please select a video."
                });
            }


            // ==================================================
            // GET FORM DATA
            // ==================================================

            const {
                festivalYear,
                title,
                description
            } = req.body;


            // ==================================================
            // VALIDATE YEAR AND TITLE
            // ==================================================

            if (!festivalYear || !title) {

                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {

                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res.status(400).json({

                    message:
                        "Please enter festival year and video title."
                });
            }


            // ==================================================
            // UPLOAD VIDEO TO CLOUDINARY
            // ==================================================

            console.log(
                "Uploading video to Cloudinary..."
            );

            const result =
                await cloudinary.uploader.upload(
                    req.file.path,
                    {
                        resource_type: "video",

                        folder:
                            "sri-durgamamba-youth/videos"
                    }
                );


            console.log(
                "Video uploaded successfully:",
                result.secure_url
            );


            // ==================================================
            // DELETE TEMPORARY LOCAL VIDEO
            // ==================================================

            if (
                fs.existsSync(req.file.path)
            ) {

                fs.unlinkSync(
                    req.file.path
                );
            }


            // ==================================================
            // SAVE VIDEO DETAILS IN MONGODB
            // ==================================================

            const video =
                new Video({

                    festivalYear:
                        Number(festivalYear),

                    title:
                        title,

                    videoUrl:
                        result.secure_url,

                    description:
                        description || "",

                    uploadedBy:
                        req.user.id
                });


            await video.save();


            // ==================================================
            // SUCCESS RESPONSE
            // ==================================================

            res.status(201).json({

                message:
                    "Video uploaded successfully!",

                video:
                    video
            });

        }

        catch (error) {

            console.log(
                "Video upload error:",
                error
            );


            // ==================================================
            // REMOVE TEMPORARY FILE IF IT EXISTS
            // ==================================================

            if (
                req.file &&
                fs.existsSync(req.file.path)
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                } catch (deleteError) {

                    console.log(
                        "Temporary video cleanup error:",
                        deleteError.message
                    );
                }
            }


            res.status(500).json({

                message:
                    "Video upload failed.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// GET ALL VIDEOS
// Public
// ======================================================

router.get(
    "/",

    async (req, res) => {

        try {

            const filter = {};


            // ==================================================
            // FILTER BY FESTIVAL YEAR
            // ==================================================

            if (req.query.festivalYear) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );
            }


            // ==================================================
            // GET VIDEOS
            // ==================================================

            const videos =
                await Video
                    .find(filter)
                    .populate(
                        "uploadedBy",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json(
                videos
            );

        }

        catch (error) {

            console.log(
                "Get videos error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to fetch videos.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// GET SINGLE VIDEO
// Public
// ======================================================

router.get(
    "/:id",

    async (req, res) => {

        try {

            const video =
                await Video
                    .findById(
                        req.params.id
                    )
                    .populate(
                        "uploadedBy",
                        "name email"
                    );


            if (!video) {

                return res.status(404).json({

                    message:
                        "Video not found."
                });
            }


            res.json(
                video
            );

        }

        catch (error) {

            console.log(
                "Get single video error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to fetch video.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// DELETE VIDEO
// Committee members only
// Deletes video from Cloudinary and MongoDB
// ======================================================

router.delete(
    "/:id",

    authMiddleware,

    async (req, res) => {

        try {

            // ==================================================
            // FIND VIDEO IN MONGODB
            // ==================================================

            const video =
                await Video.findById(
                    req.params.id
                );


            if (!video) {

                return res.status(404).json({

                    message:
                        "Video not found."
                });
            }


            // ==================================================
            // DELETE VIDEO FROM CLOUDINARY
            // ==================================================

            if (
                video.videoUrl &&
                video.videoUrl.includes(
                    "cloudinary.com"
                )
            ) {

                try {

                    const videoUrl =
                        video.videoUrl;

                    const uploadIndex =
                        videoUrl.indexOf(
                            "/upload/"
                        );


                    if (uploadIndex !== -1) {

                        let publicId =
                            videoUrl.substring(
                                uploadIndex + 8
                            );


                        // ======================================
                        // REMOVE TRANSFORMATION PARAMETERS
                        // ======================================

                        const pathParts =
                            publicId.split("/");

                        if (
                            pathParts.length > 0 &&
                            pathParts[0].startsWith("v")
                        ) {

                            publicId =
                                pathParts
                                    .slice(1)
                                    .join("/");
                        }


                        // ======================================
                        // REMOVE VERSION
                        // ======================================

                        publicId =
                            publicId.replace(
                                /^v\d+\//,
                                ""
                            );


                        // ======================================
                        // REMOVE FILE EXTENSION
                        // ======================================

                        publicId =
                            publicId.replace(
                                /\.[^/.]+$/,
                                ""
                            );


                        console.log(
                            "Cloudinary video public ID:",
                            publicId
                        );


                        // ======================================
                        // DELETE VIDEO FROM CLOUDINARY
                        // ======================================

                        const deleteResult =
                            await cloudinary
                                .uploader
                                .destroy(
                                    publicId,
                                    {
                                        resource_type:
                                            "video"
                                    }
                                );


                        console.log(
                            "Cloudinary video deletion result:",
                            deleteResult
                        );
                    }

                }

                catch (cloudinaryError) {

                    console.log(
                        "Cloudinary video delete error:",
                        cloudinaryError.message
                    );

                    // Continue with MongoDB deletion
                }
            }


            // ==================================================
            // DELETE VIDEO FROM MONGODB
            // ==================================================

            await Video.findByIdAndDelete(
                req.params.id
            );


            // ==================================================
            // SUCCESS RESPONSE
            // ==================================================

            res.json({

                message:
                    "Video deleted successfully!"
            });

        }

        catch (error) {

            console.log(
                "Video delete error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to delete video.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// MULTER ERROR HANDLER
// ======================================================

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
                        "Video size must be less than 100 MB"
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


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;