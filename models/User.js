const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  photoURL: { type: String, default: "" },
  password: { type: String, required: true },
  role: { type: String, enum: ["Supporter", "Creator", "Admin"], default: "Supporter" },
  credits: { type: Number, default: 50 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
