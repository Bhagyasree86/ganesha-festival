const express = require("express");

const Nimajjanam = require("../models/Nimajjanam");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");

const router = express.Router();


// ==========================================
// MULTER MEMORY STORAGE
// ==========================================

const storage = multer.memoryStorage();


// ==========================================
// MULTER CONFIGURATION
// ==========================================

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

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only JPG, PNG and WebP images are allowed."
                )
            );

        }

    }

});


// ==========================================
// CLOUDINARY UPLOAD FUNCTION
// ==========================================

function uploadToCloudinary(fileBuffer) {

    return new Promise((resolve, reject) => {

        const uploadStream =
            cloudinary.uploader.upload_stream(

                {
                    folder:
                        "sri-durgamamba-youth/nimajjanam",

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
            .from(fileBuffer)
            .pipe(uploadStream);

    });

}


// ==========================================
// ADD NIMAJJANAM DETAILS
// ==========================================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),

    async function (req, res) {

        try {

            const {
                festivalYear,
                date,
                time,
                location,
                description
            } = req.body;


            // ==============================
            // REQUIRED FIELD CHECK
            // ==============================

            if (
                !festivalYear ||
                !date ||
                !time ||
                !location
            ) {

                return res.status(400).json({

                    message:
                        "Please enter all required Nimajjanam details."

                });

            }


            // ==============================
            // PHOTO UPLOAD
            // ==============================

            let photoUrl = "";


            if (req.file) {

                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                photoUrl =
                    result.secure_url;

            }


            // ==============================
            // CREATE RECORD
            // ==============================

            const nimajjanam =
                new Nimajjanam({

                    festivalYear:
                        Number(
                            festivalYear
                        ),

                    date:
                        date,

                    time:
                        time,

                    location:
                        location,

                    photoUrl:
                        photoUrl,

                    description:
                        description || "",

                    uploadedBy:
                        req.user.id

                });


            await nimajjanam.save();


            // ==============================
            // SUCCESS
            // ==============================

            res.status(201).json({

                message:
                    "Nimajjanam details added successfully!",

                nimajjanam:
                    nimajjanam

            });

        }

        catch (error) {

            console.log(
                "Add Nimajjanam error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to add Nimajjanam details.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// GET ALL NIMAJJANAM DETAILS
// ==========================================

router.get(
    "/",
    async function (req, res) {

        try {

            const filter = {};


            // ==============================
            // FILTER BY YEAR
            // ==============================

            if (
                req.query.festivalYear
            ) {

                filter.festivalYear =
                    Number(
                        req.query.festivalYear
                    );

            }


            // ==============================
            // FETCH RECORDS
            // ==============================

            const records =
                await Nimajjanam.find(
                    filter
                )
                .populate(
                    "uploadedBy",
                    "name email"
                )
                .sort({

                    festivalYear:
                        -1,

                    date:
                        -1

                });


            res.json(
                records
            );

        }

        catch (error) {

            console.log(
                "Get Nimajjanam error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch Nimajjanam details.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// GET SINGLE NIMAJJANAM RECORD
// ==========================================

router.get(
    "/:id",
    async function (req, res) {

        try {

            const record =
                await Nimajjanam.findById(
                    req.params.id
                )
                .populate(
                    "uploadedBy",
                    "name email"
                );


            if (!record) {

                return res.status(404).json({

                    message:
                        "Nimajjanam record not found."

                });

            }


            res.json(
                record
            );

        }

        catch (error) {

            console.log(
                "Get Nimajjanam record error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to fetch Nimajjanam record.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// DELETE NIMAJJANAM RECORD
// ==========================================

router.delete(
    "/:id",
    authMiddleware,

    async function (req, res) {

        try {

            const record =
                await Nimajjanam.findById(
                    req.params.id
                );


            if (!record) {

                return res.status(404).json({

                    message:
                        "Nimajjanam record not found."

                });

            }


            // ==============================
            // DELETE CLOUDINARY IMAGE
            // ==============================

            if (
                record.photoUrl &&
                record.photoUrl.includes(
                    "res.cloudinary.com"
                )
            ) {

                try {

                    let publicId =
                        record.photoUrl
                            .split("/upload/")[1];

                    if (publicId) {

                        publicId =
                            publicId.replace(
                                /^v\d+\//,
                                ""
                            );

                        publicId =
                            publicId.replace(
                                /\.[^/.]+$/,
                                ""
                            );

                        await cloudinary.uploader.destroy(
                            publicId,
                            {
                                resource_type:
                                    "image"
                            }
                        );

                    }

                }

                catch (cloudinaryError) {

                    console.log(
                        "Cloudinary delete error:",
                        cloudinaryError
                    );

                }

            }


            // ==============================
            // DELETE DATABASE RECORD
            // ==============================

            await Nimajjanam.findByIdAndDelete(
                req.params.id
            );


            res.json({

                message:
                    "Nimajjanam record deleted successfully!"

            });

        }

        catch (error) {

            console.log(
                "Delete Nimajjanam error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to delete Nimajjanam record.",

                error:
                    error.message

            });

        }

    }
);


// ==========================================
// MULTER ERROR HANDLER
// ==========================================

router.use(
    function (error, req, res, next) {

        console.log(
            "Nimajjanam upload error:",
            error
        );


        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    message:
                        "Photo size must be less than 10 MB."

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


module.exports = router;