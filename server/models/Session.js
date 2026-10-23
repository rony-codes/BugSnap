
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    targetElement: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    _id: false
  }
);

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  events: {
    type: [eventSchema],
    default: []
  }
});

module.exports = mongoose.model("Session", sessionSchema);
