const express = require("express");
const Committee = require("../models/Committee");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();


// ===============================
// MULTER PHOTO STORAGE
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
            file.originalname
                .replace(/\s+/g, "-");

        cb(null, uniqueName);

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
            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only image files are allowed"
                )
            );

        }

    }

});


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


            if (req.file) {

                photoUrl =
                    "/uploads/" +
                    req.file.filename;

            }


            const committeeMember =
                await Committee.create({

                    festivalYear,

                    memberName,

                    role,

                    photoUrl,

                    description:
                        description || "",

                    uploadedBy:
                        req.user.id

                });


            res.status(201).json(
                committeeMember
            );


        } catch (error) {

            console.log(error);

            res.status(500).json({

                message:
                    "Failed to add committee member"

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
                "Failed to fetch committee members"

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
                "Failed to fetch committee member"

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
                await Committee.findByIdAndDelete(
                    req.params.id
                );


            if (!member) {

                return res.status(404).json({

                    message:
                        "Committee member not found"

                });

            }


            res.json({

                message:
                    "Committee member deleted successfully"

            });


        } catch (error) {

            console.log(error);

            res.status(500).json({

                message:
                    "Failed to delete committee member"

            });

        }

    }
);


module.exports = router;