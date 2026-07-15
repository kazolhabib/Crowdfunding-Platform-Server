const mongoose = require("mongoose");

const ContributionSchema = new mongoose.Schema({
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: [true, "Campaign ID is required"],
  },
  campaign_title: {
    type: String,
    required: [true, "Campaign title is required"],
    trim: true,
  },
  contribution_amount: {
    type: Number,
    required: [true, "Contribution amount is required"],
    min: [1, "Contribution amount must be at least 1"],
  },
  supporter_email: {
    type: String,
    required: [true, "Supporter email is required"],
    lowercase: true,
    trim: true,
  },
  supporter_name: {
    type: String,
    required: [true, "Supporter name is required"],
    trim: true,
  },
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
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Contribution || mongoose.model("Contribution", ContributionSchema);
