const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  creator_email: {
    type: String,
    required: [true, "Creator email is required"],
    lowercase: true,
    trim: true,
  },
  creator_name: {
    type: String,
    required: [true, "Creator name is required"],
    trim: true,
  },
  withdrawal_credit: {
    type: Number,
    required: [true, "Withdrawal credit amount is required"],
    min: [1, "Withdrawal credit must be at least 1"],
  },
  withdrawal_amount: {
    type: Number,
    required: [true, "Withdrawal amount is required"],
    min: [1, "Withdrawal amount must be at least 1"],
  },
  payment_system: {
    type: String,
    required: [true, "Payment system is required"],
    trim: true,
  },
  account_number: {
    type: String,
    required: [true, "Account number is required"],
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: "pending",
  },
  withdraw_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Withdrawal || mongoose.model("Withdrawal", WithdrawalSchema);
