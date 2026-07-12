const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user_email: { type: String, required: true, lowercase: true, trim: true },
  user_name: { type: String, required: true, trim: true },
  stripe_session_id: { type: String, required: true, unique: true },
  amount_usd: { type: Number, required: true },
  credits_purchased: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
