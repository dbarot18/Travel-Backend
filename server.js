// server.js - Main server file
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
}));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/travel-dashboard",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Request Model
const requestSchema = new mongoose.Schema({
  clientName: String,
  email: String,
  type: String, // flight, hotel, car
  destination: String,
  date: Date,
  budget: Number,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

const Request = mongoose.model("Request", requestSchema);

// Routes

// GET all requests with optional status filter
app.get("/api/requests", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single request
app.get("/api/requests/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new request
app.post("/api/requests", async (req, res) => {
  try {
    const newRequest = new Request(req.body);
    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update request status
app.put("/api/requests/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status, notes, updatedAt: new Date() },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    // Here you would typically send an email notification
    
    // Send a mail notification
    console.log(
      `Request ${req.params.id} updated to ${status}. Email sent to ${request.email}`
    );
    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE request
app.delete("/api/requests/:id", async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
