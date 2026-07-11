const express = require("express");
const router = express.Router();
const { campaigns } = require("../data/mockData");

// GET /api/campaigns/top - Get top funded campaigns
router.get("/top", (req, res) => {
  const topCampaigns = campaigns
    .sort((a, b) => b.raised - a.raised)
    .slice(0, 6);
  res.json({ success: true, data: topCampaigns });
});

// GET /api/campaigns - Get all campaigns
router.get("/", (req, res) => {
  res.json({ success: true, data: campaigns });
});

// GET /api/campaigns/:id - Get campaign by ID
router.get("/:id", (req, res) => {
  const campaign = campaigns.find((c) => c._id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }
  res.json({ success: true, data: campaign });
});

module.exports = router;
