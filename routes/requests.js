const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const { sendEmail } = require("../utils/email");

// Get all requests
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create request
router.post("/", async (req, res) => {
  try {
    const request = new Request(req.body);
    await request.save();

    // Emit socket event
    const io = req.app.get("io");
    io.emit("newRequest", request);

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update request status
router.put("/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status, notes, updatedAt: Date.now() },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Send email notification
    await sendEmail({
      to: request.email,
      subject: `Travel Request ${status.toUpperCase()}`,
      html: `
        <h2>Travel Request Update</h2>
        <p>Dear ${request.clientName},</p>
        <p>Your travel request has been <strong>${status}</strong>.</p>
        <h3>Request Details:</h3>
        <ul>
          <li>Type: ${request.type}</li>
          <li>Destination: ${request.destination}</li>
          <li>Date: ${new Date(request.date).toLocaleDateString()}</li>
          <li>Budget: $${request.budget}</li>
        </ul>
        ${notes ? `<p>Notes: ${notes}</p>` : ""}
        <p>Thank you for using our service!</p>
      `,
    });

    // Emit socket event
    const io = req.app.get("io");
    io.emit("requestUpdated", request);

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete request
router.delete("/:id", async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const total = await Request.countDocuments();
    const pending = await Request.countDocuments({ status: "pending" });
    const approved = await Request.countDocuments({ status: "approved" });
    const rejected = await Request.countDocuments({ status: "rejected" });

    res.json({ total, pending, approved, rejected });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
