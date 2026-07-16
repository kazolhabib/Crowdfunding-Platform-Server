const express = require("express");
const connectDB = require("../config/db");
const Campaign = require("../models/Campaign");
const Contribution = require("../models/Contribution");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/campaigns: Get top 6 funded approved campaigns
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const campaigns = await Campaign.find({ status: "approved" })
      .sort({ amount_raised: -1 })
      .limit(6);
    res.json({ success: true, campaigns });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch campaigns." });
  }
});

// GET /api/campaigns/explore: Get active approved campaigns
router.get("/explore", async (req, res) => {
  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const campaigns = await Campaign.find({
      status: "approved",
      deadline: { $gte: today },
    }).sort({ createdAt: -1 });

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error("Explore campaigns error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch campaigns." });
  }
});

// GET /api/campaigns/:id: Get campaign details by ID
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found." });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    console.error("Get campaign by ID error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch campaign." });
  }
});

// POST /api/campaigns/:id: Submit a contribution to a campaign
router.post("/:id", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.userId).select("-password");
    if (!user || user.role !== "Supporter") {
      return res.status(403).json({ success: false, error: "Only supporters can contribute." });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found." });
    }

    if (campaign.status !== "approved") {
      return res.status(400).json({ success: false, error: "This campaign is not accepting contributions." });
    }

    if (new Date(campaign.deadline) < new Date()) {
      return res.status(400).json({ success: false, error: "Campaign deadline has passed." });
    }

    const { contribution_amount } = req.body;
    const amount = Number(contribution_amount);

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < campaign.minimum_contribution) {
      return res.status(400).json({
        success: false,
        error: `Minimum contribution is ${campaign.minimum_contribution} credits.`,
      });
    }

    // Atomically reserve credits
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, credits: { $gte: amount } },
      { $inc: { credits: -amount } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ success: false, error: "Insufficient credits." });
    }

    let contribution;
    try {
      contribution = await Contribution.create({
        campaign_id: campaign._id,
        campaign_title: campaign.title,
        contribution_amount: amount,
        supporter_email: user.email,
        supporter_name: user.name,
        creator_email: campaign.creator_email,
        creator_name: campaign.creator_name,
        status: "pending",
      });
    } catch (error) {
      // Restore credits if creation fails
      await User.findByIdAndUpdate(user._id, { $inc: { credits: amount } });
      throw error;
    }

    // Notify campaign creator
    try {
      await createNotification({
        message: `${user.name} contributed ${amount} credits to your campaign "${campaign.title}". Review it now.`,
        toEmail: campaign.creator_email,
        actionRoute: "/dashboard/review-contributions",
      });
    } catch (notificationError) {
      console.error("Contribution notification error:", notificationError);
    }

    res.json({ success: true, contribution, newCredits: updatedUser.credits });
  } catch (error) {
    console.error("Contribute error:", error);
    res.status(500).json({ success: false, error: "Failed to submit contribution." });
  }
});

module.exports = router;
