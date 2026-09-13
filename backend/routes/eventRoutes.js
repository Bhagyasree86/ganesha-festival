const express = require("express");
const Event = require("../models/Event");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// ADD EVENT
// Committee members only
// ======================================================

router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            festivalYear,
            title,
            date,
            time,
            description
        } = req.body;

        if (!festivalYear || !title || !date || !time) {
            return res.status(400).json({
                message: "Please enter year, title, date and time."
            });
        }

        const event = new Event({
            festivalYear: festivalYear,
            title: title,
            date: date,
            time: time,
            description: description || "",
            createdBy: req.user.id
        });

        await event.save();

        res.status(201).json({
            message: "Event added successfully!",
            event: event
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to add event.",
            error: error.message
        });
    }
});


// ======================================================
// GET ALL EVENTS
// Public
// ======================================================

router.get("/", async (req, res) => {
    try {

        const filter = {};

        // Filter by festival year if provided
        if (req.query.festivalYear) {
            filter.festivalYear =
                Number(req.query.festivalYear);
        }

        const events = await Event.find(filter)
            .populate("createdBy", "name email")
            .sort({ date: 1 });

        res.json(events);

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Unable to fetch events.",
            error: error.message
        });
    }
});


// ======================================================
// GET SINGLE EVENT
// Public
// ======================================================

router.get("/:id", async (req, res) => {
    try {

        const event = await Event.findById(req.params.id)
            .populate("createdBy", "name email");

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        res.json(event);

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Unable to fetch event.",
            error: error.message
        });
    }
});


// ======================================================
// EDIT EVENT
// Committee members only
// ======================================================

router.put("/:id", authMiddleware, async (req, res) => {
    try {

        const {
            festivalYear,
            title,
            date,
            time,
            description
        } = req.body;

        if (!festivalYear || !title || !date || !time) {
            return res.status(400).json({
                message: "Please enter year, title, date and time."
            });
        }

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            {
                festivalYear: festivalYear,
                title: title,
                date: date,
                time: time,
                description: description || ""
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        res.json({
            message: "Event updated successfully!",
            event: event
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to update event.",
            error: error.message
        });
    }
});


// ======================================================
// DELETE EVENT
// Committee members only
// ======================================================

router.delete("/:id", authMiddleware, async (req, res) => {
    try {

        const event = await Event.findByIdAndDelete(
            req.params.id
        );

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        res.json({
            message: "Event deleted successfully!"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Failed to delete event.",
            error: error.message
        });
    }
});


module.exports = router;