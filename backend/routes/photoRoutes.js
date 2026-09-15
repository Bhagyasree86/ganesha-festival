const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const Photo = require("../models/photo");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// ==========================================
// MULTER MEMORY STORAGE
// ==========================================

const storage = multer.memoryStorage();


// ==========================================
// ONLY ALLOW IMAGE FILES
// ==========================================

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
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});


// ==========================================
// UPLOAD IMAGE TO CLOUDINARY
// ==========================================

function uploadToCloudinary(buffer) {

    return new Promise((resolve, reject) => {

        const stream =
            cloudinary.uploader.upload_stream(
                {
                    folder: "sri-durgamamba-youth/photos",
                    resource_type: "image"
                },

                (error, result) => {

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


// ==========================================
// UPLOAD PHOTO
// ==========================================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),

    async (req, res) => {

        try {

            // ----------------------------------
            // CHECK FILE
            // ----------------------------------

            if (!req.file) {

                return res.status(400).json({
                    message: "Please select a photo."
                });

            }


            // ----------------------------------
            // GET FORM DATA
            // ----------------------------------

            const {
                festivalYear,
                event,
                title
            } = req.body;


            // ----------------------------------
            // VALIDATE DATA
            // ----------------------------------

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


            console.log(
                "================================="
            );

            console.log(
                "Uploading photo to Cloudinary..."
            );

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "Size:",
                req.file.size
            );

            console.log(
                "Type:",
                req.file.mimetype
            );


            // ----------------------------------
            // UPLOAD TO CLOUDINARY
            // ----------------------------------

            const result =
                await uploadToCloudinary(
                    req.file.buffer
                );


            console.log(
                "Cloudinary upload successful!"
            );

            console.log(
                "Cloudinary URL:",
                result.secure_url
            );

            console.log(
                "Cloudinary Public ID:",
                result.public_id
            );


            // ----------------------------------
            // SAVE TO MONGODB
            // ----------------------------------

            const photo = new Photo({

                festivalYear: Number(
                    festivalYear
                ),

                event: event,

                title: title,

                imageUrl:
                    result.secure_url,

                uploadedBy:
                    req.user.id

            });


            await photo.save();


            console.log(
                "Photo saved to MongoDB!"
            );

            console.log(
                "================================="
            );


            // ----------------------------------
            // SUCCESS
            // ----------------------------------

            res.status(201).json({

                message:
                    "Photo uploaded successfully!",

                photo: photo

            });

        }


        catch (error) {

            console.log(
                "================================="
            );

            console.log(
                "PHOTO UPLOAD ERROR"
            );

            console.log(error);

            console.log(
                "================================="
            );


            res.status(500).json({

                message:
                    "Photo upload failed.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// GET ALL PHOTOS
// ==========================================

router.get(
    "/",

    async (req, res) => {

        try {

            const filter = {};


            // Optional year filter

            if (req.query.festivalYear) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );

            }


            const photos =
                await Photo.find(filter)
                    .populate(
                        "uploadedBy",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json(photos);

        }

        catch (error) {

            console.log(
                "Get photos error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch photos.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// GET SINGLE PHOTO
// ==========================================

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

        }

        catch (error) {

            console.log(
                "Get single photo error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch photo.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// DELETE PHOTO
// ==========================================

router.delete(
    "/:id",
    authMiddleware,

    async (req, res) => {

        try {

            // ----------------------------------
            // FIND PHOTO
            // ----------------------------------

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


            // ----------------------------------
            // DELETE FROM CLOUDINARY
            // ----------------------------------

            if (
                photo.imageUrl &&
                photo.imageUrl.includes(
                    "cloudinary.com"
                )
            ) {

                try {

                    const url =
                        photo.imageUrl;


                    const uploadIndex =
                        url.indexOf(
                            "/upload/"
                        );


                    if (uploadIndex !== -1) {

                        let publicId =
                            url.substring(
                                uploadIndex + 8
                            );


                        // Remove version number

                        publicId =
                            publicId.replace(
                                /^v\d+\//,
                                ""
                            );


                        // Remove file extension

                        publicId =
                            publicId.replace(
                                /\.[^/.]+$/,
                                ""
                            );


                        console.log(
                            "Deleting Cloudinary image:",
                            publicId
                        );


                        await cloudinary.uploader.destroy(
                            publicId,
                            {
                                resource_type: "image"
                            }
                        );


                        console.log(
                            "Cloudinary image deleted."
                        );

                    }

                }

                catch (cloudinaryError) {

                    console.log(
                        "Cloudinary delete error:",
                        cloudinaryError.message
                    );

                }

            }


            // ----------------------------------
            // DELETE MONGODB RECORD
            // ----------------------------------

            await Photo.findByIdAndDelete(
                req.params.id
            );


            // ----------------------------------
            // SUCCESS
            // ----------------------------------

            res.json({

                message:
                    "Photo deleted successfully!"

            });

        }

        catch (error) {

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
// ==========================================
// CLEANUP OLD BROKEN LOCAL-UPLOAD RECORDS
// ==========================================

router.delete(
    "/cleanup-old-uploads",
    authMiddleware,
    async (req, res) => {
        try {
            const result = await Photo.deleteMany({
                imageUrl: {
                    $regex: "^/uploads/"
                }
            });

            res.json({
                message:
                    "Old broken photo records deleted successfully.",
                deletedCount:
                    result.deletedCount
            });
        } catch (error) {
            console.log(
                "Cleanup old photos error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to clean old photo records.",
                error:
                    error.message
            });
        }
    }
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;