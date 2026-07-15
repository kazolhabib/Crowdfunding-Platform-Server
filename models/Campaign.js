const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Campaign title is required"],
    trim: true,
  },
  story: {
    type: String,
    required: [true, "Campaign story is required"],
  },
  category: {
    type: String,
    required: [true, "Campaign category is required"],
    trim: true,
  },
  funding_goal: {
    type: Number,
    required: [true, "Funding goal is required"],
    min: [1, "Funding goal must be at least 1"],
  },
  minimum_contribution: {
    type: Number,
    required: [true, "Minimum contribution is required"],
    min: [1, "Minimum contribution must be at least 1"],
  },
  amount_raised: {
    type: Number,
    default: 0,
    min: [0, "Amount raised cannot be negative"],
  },
  deadline: {
    type: Date,
    required: [true, "Deadline is required"],
  },
  reward_info: {
    type: String,
    default: "",
  },
  image_url: {
    type: String,
    default: "",
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
