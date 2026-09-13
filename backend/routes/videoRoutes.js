const express = require("express");
const multer = require("multer");
const fs = require("fs");

const Video = require("../models/video");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// ======================================================
// MULTER
// Temporarily stores the selected video on the server
// Maximum video size: 100 MB
// ======================================================

const upload = multer({
    dest: "uploads/videos/",

    limits: {
        fileSize: 100 * 1024 * 1024
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

            // Check whether video was selected

            if (!req.file) {

                return res.status(400).json({

                    message:
                        "Please select a video."

                });

            }


            // Get form data

            const {
                festivalYear,
                title,
                description
            } = req.body;


            // Validate year and title

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
            // Upload video to Cloudinary
            // ==================================================

            const result =
                await cloudinary.uploader.upload(
                    req.file.path,
                    {
                        resource_type: "video",

                        folder:
                            "ganesha-festival/videos"
                    }
                );


            // ==================================================
            // Delete temporary local video
            // ==================================================

            if (
                fs.existsSync(req.file.path)
            ) {

                fs.unlinkSync(
                    req.file.path
                );

            }


            // ==================================================
            // Save video details in MongoDB
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
            // Remove temporary file if it exists
            // ==================================================

            if (
                req.file &&
                fs.existsSync(req.file.path)
            ) {

                fs.unlinkSync(
                    req.file.path
                );

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
            // Filter by festival year
            // ==================================================

            if (req.query.festivalYear) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );

            }


            // ==================================================
            // Get videos
            // ==================================================

            const videos =
                await Video.find(
                    filter
                )

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
            // Find video in MongoDB
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
            // Get Cloudinary public ID
            // ==================================================

            const videoUrl =
                video.videoUrl;


            const urlParts =
                videoUrl.split("/");


            const uploadIndex =
                urlParts.indexOf("upload");


            if (uploadIndex !== -1) {

                let publicId =
                    urlParts
                        .slice(
                            uploadIndex + 1
                        )
                        .join("/");


                // ==================================================
                // Remove Cloudinary version
                // ==================================================

                publicId =
                    publicId.replace(
                        /^v\d+\//,
                        ""
                    );


                // ==================================================
                // Remove file extension
                // ==================================================

                publicId =
                    publicId.replace(
                        /\.[^/.]+$/,
                        ""
                    );


                console.log(
                    "Cloudinary public ID:",
                    publicId
                );


                // ==================================================
                // Delete video from Cloudinary
                // ==================================================

                await cloudinary.uploader.destroy(
                    publicId,

                    {
                        resource_type:
                            "video"
                    }
                );

            }


            // ==================================================
            // Delete video from MongoDB
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
// EXPORT ROUTER
// ======================================================

module.exports = router;