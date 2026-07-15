const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, "Notification message is required"],
    trim: true,
  },
  toEmail: {
    type: String,
    required: [true, "Recipient email is required"],
    lowercase: true,
    trim: true,
  },
  actionRoute: {
    type: String,
    default: "",
  },
  read: {
    type: Boolean,
    default: false,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
