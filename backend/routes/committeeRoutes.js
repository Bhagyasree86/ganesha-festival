const express = require("express");
const Committee = require("../models/committee");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// ===============================
// MULTER MEMORY STORAGE
// ===============================

const storage = multer.memoryStorage();

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
                    "Only JPG, PNG and WebP images are allowed"
                )
            );

        }

    }

});


// ===============================
// CLOUDINARY IMAGE UPLOAD
// ===============================

function uploadToCloudinary(fileBuffer) {

    return new Promise((resolve, reject) => {

        const stream =
            cloudinary.uploader.upload_stream(

                {
                    folder:
                        "sri-durgamamba-youth/committee",

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
            .from(fileBuffer)
            .pipe(stream);

    });

}


// ===============================
// ADD COMMITTEE MEMBER
// ===============================

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),
    async (req, res) => {

        try {

            const {
                festivalYear,
                memberName,
                role,
                description
            } = req.body;


            if (
                !festivalYear ||
                !memberName ||
                !role
            ) {

                return res.status(400).json({

                    message:
                        "Festival year, member name and role are required"

                });

            }


            let photoUrl = "";


            // Upload photo to Cloudinary
            if (req.file) {

                const result =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                photoUrl =
                    result.secure_url;

            }


            // Save committee member
            const committeeMember =
                await Committee.create({

                    festivalYear:
                        Number(festivalYear),

                    memberName,

                    role,

                    photoUrl,

                    description:
                        description || "",

                    uploadedBy:
                        req.user.id

                });


            res.status(201).json({

                message:
                    "Committee member added successfully",

                committeeMember

            });


        } catch (error) {

            console.log(
                "Committee upload error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to add committee member",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// GET ALL COMMITTEE MEMBERS
// ===============================

router.get("/", async (req, res) => {

    try {

        const {
            festivalYear
        } = req.query;


        const filter = {};


        if (festivalYear) {

            filter.festivalYear =
                Number(festivalYear);

        }


        const members =
            await Committee.find(filter)

                .populate(
                    "uploadedBy",
                    "name email"
                )

                .sort({

                    festivalYear: -1,

                    createdAt: -1

                });


        res.json(members);


    } catch (error) {

        console.log(error);

        res.status(500).json({

            message:
                "Failed to fetch committee members",

            error:
                error.message

        });

    }

});


// ===============================
// GET ONE COMMITTEE MEMBER
// ===============================

router.get("/:id", async (req, res) => {

    try {

        const member =
            await Committee.findById(
                req.params.id
            );


        if (!member) {

            return res.status(404).json({

                message:
                    "Committee member not found"

            });

        }


        res.json(member);


    } catch (error) {

        console.log(error);

        res.status(500).json({

            message:
                "Failed to fetch committee member",

            error:
                error.message

        });

    }

});


// ===============================
// DELETE COMMITTEE MEMBER
// ===============================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const member =
                await Committee.findById(
                    req.params.id
                );


            if (!member) {

                return res.status(404).json({

                    message:
                        "Committee member not found"

                });

            }


            // Delete image from Cloudinary
            if (
                member.photoUrl &&
                member.photoUrl.includes(
                    "res.cloudinary.com"
                )
            ) {

                try {

                    let publicId =
                        member.photoUrl
                            .split("/upload/")[1];

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
                            resource_type: "image"
                        }
                    );

                } catch (cloudinaryError) {

                    console.log(
                        "Cloudinary delete error:",
                        cloudinaryError
                    );

                }

            }


            // Delete database record
            await Committee.findByIdAndDelete(
                req.params.id
            );


            res.json({

                message:
                    "Committee member deleted successfully"

            });


        } catch (error) {

            console.log(error);

            res.status(500).json({

                message:
                    "Failed to delete committee member",

                error:
                    error.message

            });

        }

    }
);


// ===============================
// MULTER ERROR HANDLER
// ===============================

router.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {

            return res.status(400).json({

                message:
                    error.message

            });

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