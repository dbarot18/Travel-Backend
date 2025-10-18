import express, { json } from "express";
import cors from "cors";
import { connect } from "mongoose";
import nodemailer from "nodemailer";
import { config } from "dotenv";
import Request from "./models/Request.js";

config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(json());

// MongoDB Connection
connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/travel-dashboard",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Routes

// GET all requests
app.get("/api/requests", async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single request
app.get("/api/requests/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(request);
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new request
app.post("/api/requests", async (req, res) => {
  try {
    const { clientName, email, type, destination, startDate, endDate, budget } =
      req.body;

    // Validation
    if (
      !clientName ||
      !email ||
      !type ||
      !destination ||
      !startDate ||
      !endDate ||
      !budget
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newRequest = new Request({
      clientName,
      email,
      type,
      destination,
      startDate,
      endDate,
      budget,
      status: "pending",
    });

    await newRequest.save();

    // Send confirmation email to client
    await sendEmail({
      to: email,
      subject: "Travel Request Received",
      html: `
        <h2>Travel Request Confirmation</h2>
        <p>Dear ${clientName},</p>
        <p>We have received your travel request with the following details:</p>
        <ul>
          <li><strong>Type:</strong> ${type}</li>
          <li><strong>Destination:</strong> ${destination}</li>
          <li><strong>From:</strong> ${new Date(
            startDate
          ).toLocaleDateString()}</li>
          <li><strong>To:</strong> ${new Date(
            endDate
          ).toLocaleDateString()}</li>
          <li><strong>Budget:</strong> $${budget}</li>
        </ul>
        <p>Your request is currently <strong>pending</strong> review. We'll get back to you within 24 hours.</p>
        <p>Best regards,<br>Travel Request Team</p>
      `,
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE request status
app.patch("/api/requests/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (status) request.status = status;
    if (notes !== undefined) request.notes = notes;
    request.updatedAt = Date.now();

    await request.save();

    // Send status update email
    if (status) {
      await sendEmail({
        to: request.email,
        subject: `Travel Request ${
          status.charAt(0).toUpperCase() + status.slice(1)
        }`,
        html: `
          <h2>Travel Request Update</h2>
          <p>Dear ${request.clientName},</p>
          <p>Your travel request to <strong>${
            request.destination
          }</strong> has been <strong>${status}</strong>.</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Travel Request Team</p>
        `,
      });
    }

    res.json(request);
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE request
app.delete("/api/requests/:id", async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
