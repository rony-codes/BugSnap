require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const Session = require("./models/Session");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BugSnap server is running!"
  });
});

app.get("/report/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "report.html"));
});
// Save a new testing session
app.post("/api/sessions", async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: "The request must contain an events array."
      });
    }

    const session = await Session.create({
      sessionId: randomUUID(),
      events
    });

    return res.status(201).json({
      success: true,
      message: "Session saved successfully.",
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      eventCount: session.events.length
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid session data.",
        errors: Object.values(error.errors).map(
          (item) => item.message
        )
      });
    }

    console.error("[BugSnap] Failed to save session:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save session."
    });
  }
});

// Retrieve a session using its public sessionId
app.get("/api/sessions/:id", async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.id
    }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found."
      });
    }

    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error("[BugSnap] Failed to retrieve session:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve session."
    });
  }
});

// Handle malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body."
    });
  }

  next(err);
});

// Connect to MongoDB before accepting requests
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("[BugSnap] Connected to MongoDB");

    app.listen(PORT,"0.0.0.0", () => {
      console.log(`BugSnap server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("[BugSnap] Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
