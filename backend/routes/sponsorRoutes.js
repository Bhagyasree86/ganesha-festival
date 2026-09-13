const express = require("express");

const Sponsor =
    require("../models/sponsor");

const authMiddleware =
    require("../middleware/authMiddleware");

const multer =
    require("multer");

const path =
    require("path");


const router =
    express.Router();


/* =========================================
   MULTER STORAGE
========================================= */

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    path.join(
                        __dirname,
                        "../uploads"
                    )
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const safeName =
                    file.originalname
                        .replace(
                            /\s+/g,
                            "-"
                        );

                const uniqueName =
                    Date.now() +
                    "-" +
                    safeName;

                cb(
                    null,
                    uniqueName
                );

            }

    });


/* =========================================
   FILE FILTER
========================================= */

const upload =
    multer({

        storage:

            storage,

        limits: {

            fileSize:
                10 *
                1024 *
                1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

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

                    cb(
                        null,
                        true
                    );

                }
                else {

                    cb(
                        new Error(
                            "Only JPG, JPEG, PNG and WebP images are allowed"
                        )
                    );

                }

            }

    });


/* =========================================
   ADD SPONSOR
========================================= */

router.post(
    "/",
    authMiddleware,
    upload.single("photo"),

    async function (
        req,
        res
    ) {

        try {

            const {
                festivalYear,
                sponsorName,
                amount,
                description
            } = req.body;


            /* ==============================
               VALIDATION
            ============================== */

            if (
                !festivalYear ||
                !sponsorName
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Festival year and sponsor name are required"

                });

            }


            /* ==============================
               PHOTO URL
            ============================== */

            let photoUrl = "";


            if (req.file) {

                photoUrl =
                    "/uploads/" +
                    req.file.filename;

            }


            /* ==============================
               CREATE SPONSOR
            ============================== */

            const sponsor =
                await Sponsor.create({

                    festivalYear:
                        Number(
                            festivalYear
                        ),

                    sponsorName:
                        sponsorName,

                    amount:
                        Number(
                            amount
                        ) || 0,

                    photoUrl:
                        photoUrl,

                    description:
                        description ||
                        "",

                    uploadedBy:
                        req.user.id

                });


            res.status(
                201
            ).json(
                sponsor
            );

        }


        catch (error) {

            console.log(
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to add sponsor"

            });

        }

    }
);


/* =========================================
   GET ALL SPONSORS
========================================= */

router.get(
    "/",

    async function (
        req,
        res
    ) {

        try {

            const {
                festivalYear
            } = req.query;


            const filter = {};


            if (
                festivalYear
            ) {

                filter.festivalYear =
                    Number(
                        festivalYear
                    );

            }


            const sponsors =
                await Sponsor.find(
                    filter
                )
                .populate(
                    "uploadedBy",
                    "name email"
                )
                .sort({

                    festivalYear:
                        -1,

                    createdAt:
                        -1

                });


            res.json(
                sponsors
            );

        }


        catch (error) {

            console.log(
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to fetch sponsors"

            });

        }

    }
);


/* =========================================
   GET SINGLE SPONSOR
========================================= */

router.get(
    "/:id",

    async function (
        req,
        res
    ) {

        try {

            const sponsor =
                await Sponsor.findById(
                    req.params.id
                );


            if (!sponsor) {

                return res.status(
                    404
                ).json({

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
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to fetch sponsor"

            });

        }

    }
);


/* =========================================
   DELETE SPONSOR
========================================= */

router.delete(
    "/:id",

    authMiddleware,

    async function (
        req,
        res
    ) {

        try {

            const sponsor =
                await Sponsor.findByIdAndDelete(
                    req.params.id
                );


            if (!sponsor) {

                return res.status(
                    404
                ).json({

                    message:
                        "Sponsor not found"

                });

            }


            res.json({

                message:
                    "Sponsor deleted successfully"

            });

        }


        catch (error) {

            console.log(
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to delete sponsor"

            });

        }

    }
);


/* =========================================
   MULTER ERROR HANDLER
========================================= */

router.use(
    function (
        error,
        req,
        res,
        next
    ) {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(
                    400
                ).json({

                    message:
                        "Photo size must be less than 10 MB"

                });

            }

        }


        if (error) {

            return res.status(
                400
            ).json({

                message:
                    error.message

            });

        }


        next();

    }
);


module.exports =
    router;