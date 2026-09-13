const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Photo = require("../models/Photo");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// WHERE UPLOADED IMAGES ARE STORED
// ===============================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, "uploads/");

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});


// ===============================
// ONLY ALLOW IMAGE FILES
// ===============================

const fileFilter = function (req, file, cb) {

    if (file.mimetype.startsWith("image/")) {

        cb(null, true);

    } else {

        cb(
            new Error("Only image files are allowed!"),
            false
        );

    }

};


const upload = multer({

    storage: storage,
    fileFilter: fileFilter

});


// ===============================
// UPLOAD PHOTO
// ===============================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    message: "Please select a photo."

                });

            }


            const {
                festivalYear,
                event,
                title
            } = req.body;


            if (
                !festivalYear ||
                !event ||
                !title
            ) {

                return res.status(400).json({

                    message:
                        "Please enter year, event and title."

                });

            }


            const photo = new Photo({

                festivalYear: festivalYear,

                event: event,

                title: title,

                imageUrl:
                    `/uploads/${req.file.filename}`,

                uploadedBy: req.user.id

            });


            await photo.save();


            res.status(201).json({

                message:
                    "Photo uploaded successfully!",

                photo: photo

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Photo upload failed.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// GET ALL PHOTOS
// ===============================

router.get(
    "/",
    async (req, res) => {

        try {

            const photos =
                await Photo.find()
                    .populate(
                        "uploadedBy",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json(photos);


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Unable to fetch photos.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// GET SINGLE PHOTO
// ===============================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const photo =
                await Photo.findById(
                    req.params.id
                );


            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }


            res.json(photo);


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Unable to fetch photo.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// DELETE PHOTO
// ===============================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            // Find photo in MongoDB
            const photo =
                await Photo.findById(
                    req.params.id
                );


            // Check if photo exists
            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }


            // ===============================
            // DELETE IMAGE FILE
            // ===============================

            if (photo.imageUrl) {

                const imagePath =
                    path.join(
                        __dirname,
                        "..",
                        photo.imageUrl
                    );


                if (
                    fs.existsSync(imagePath)
                ) {

                    fs.unlinkSync(imagePath);

                    console.log(
                        "Image file deleted:",
                        imagePath
                    );

                }

            }


            // ===============================
            // DELETE DATABASE RECORD
            // ===============================

            await Photo.findByIdAndDelete(
                req.params.id
            );


            // ===============================
            // SUCCESS RESPONSE
            // ===============================

            res.json({

                message:
                    "Photo deleted successfully!"

            });


        } catch (error) {

            console.log(
                "Delete photo error:",
                error
            );


            res.status(500).json({

                message:
                    "Photo deletion failed.",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// EXPORT ROUTER
// ===============================

module.exports = router;