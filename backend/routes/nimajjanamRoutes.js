const express = require("express");

const Nimajjanam = require("../models/Nimajjanam");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

const router = express.Router();


// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            path.join(
                __dirname,
                "../uploads"
            )
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            file.originalname.replace(
                /\s+/g,
                "-"
            );

        cb(
            null,
            uniqueName
        );

    }

});


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
            // PHOTO
            // ==============================

            let photoUrl = "";


            if (req.file) {

                photoUrl =
                    "/uploads/" +
                    req.file.filename;

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