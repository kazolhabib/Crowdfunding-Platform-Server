const connectDB = require("../config/db");
const Notification = require("../models/Notification");

async function createNotification({ message, toEmail, actionRoute }) {
  try {
    await connectDB();
    const notif = new Notification({
      message,
      toEmail: toEmail.toLowerCase(),
      actionRoute: actionRoute || "",
      read: false,
      time: new Date(),
    });
    await notif.save();
    return notif;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

module.exports = { createNotification };
