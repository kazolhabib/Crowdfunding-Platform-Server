const express = require("express");
const connectDB = require("../config/db");
const Campaign = require("../models/Campaign");
const Contribution = require("../models/Contribution");
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");
const { authMiddleware, creatorOnly } = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET: Fetch creator's campaigns
router.get("/campaigns", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const campaigns = await Campaign.find({ creator_email: req.user.email }).sort({ deadline: -1 });
    res.json({ success: true, campaigns });
  } catch (error) {
    console.error("Get creator campaigns error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch campaigns." });
  }
});

// POST: Create new campaign
router.post("/campaigns", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const { title, story, category, funding_goal, minimum_contribution, deadline, reward_info, image_url } = req.body;

    if (!title || !story || !category || !funding_goal || !minimum_contribution || !deadline) {
      return res.status(400).json({ success: false, error: "All required fields must be filled." });
    }

    const campaign = new Campaign({
      title,
      story,
      category,
      funding_goal: Number(funding_goal),
      minimum_contribution: Number(minimum_contribution),
      deadline: new Date(deadline),
      reward_info: reward_info || "",
      image_url: image_url || "",
      creator_email: user.email,
      creator_name: user.name,
      status: "pending",
    });

    await campaign.save();

    // Notify all admin users
    const admins = await User.find({ role: "Admin" }).select("email");
    for (const admin of admins) {
      await createNotification({
        message: `New campaign "${title}" submitted by ${user.name} is awaiting your approval.`,
        toEmail: admin.email,
        actionRoute: "/dashboard/campaign-approvals",
      });
    }

    res.json({ success: true, campaign });
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({ success: false, error: "Failed to create campaign." });
  }
});

// PUT: Update campaign (title, story, reward_info)
router.put("/campaigns", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const { campaignId, title, story, reward_info } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Campaign ID is required." });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found." });
    }
    if (campaign.creator_email !== req.user.email) {
      return res.status(403).json({ success: false, error: "You can only edit your own campaigns." });
    }

    if (title) campaign.title = title;
    if (story) campaign.story = story;
    if (reward_info !== undefined) campaign.reward_info = reward_info;

    await campaign.save();
    res.json({ success: true, campaign });
  } catch (error) {
    console.error("Update campaign error:", error);
    res.status(500).json({ success: false, error: "Failed to update campaign." });
  }
});

// DELETE: Delete campaign and refund all approved supporters
router.delete("/campaigns", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const campaignId = req.query.id;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Campaign ID is required." });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found." });
    }
    if (campaign.creator_email !== req.user.email) {
      return res.status(403).json({ success: false, error: "You can only delete your own campaigns." });
    }

    // Refund all approved contributions
    const approvedContributions = await Contribution.find({
      campaign_id: campaignId,
      status: "approved",
    });

    for (const contrib of approvedContributions) {
      await User.findOneAndUpdate(
        { email: contrib.supporter_email },
        { $inc: { credits: contrib.contribution_amount } }
      );
      await createNotification({
        message: `Campaign "${campaign.title}" has been deleted. Your contribution of ${contrib.contribution_amount} credits has been refunded.`,
        toEmail: contrib.supporter_email,
        actionRoute: "/dashboard/my-contributions",
      });
    }

    // Delete all contributions for this campaign
    await Contribution.deleteMany({ campaign_id: campaignId });

    // Delete the campaign
    await Campaign.findByIdAndDelete(campaignId);

    res.json({ success: true, message: "Campaign deleted and supporters refunded." });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ success: false, error: "Failed to delete campaign." });
  }
});

// GET: Fetch pending contributions for creator's campaigns
router.get("/contributions", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const contributions = await Contribution.find({
      creator_email: req.user.email,
      status: "pending",
    }).sort({ date: -1 });

    res.json({ success: true, contributions });
  } catch (error) {
    console.error("Get contributions error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch contributions." });
  }
});

// PUT: Approve or reject a contribution
router.put("/contributions", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const { contributionId, action } = req.body;
    if (!contributionId || !action) {
      return res.status(400).json({ success: false, error: "Contribution ID and action are required." });
    }

    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      return res.status(404).json({ success: false, error: "Contribution not found." });
    }
    if (contribution.creator_email !== req.user.email) {
      return res.status(403).json({ success: false, error: "Unauthorized." });
    }
    if (contribution.status !== "pending") {
      return res.status(400).json({ success: false, error: "This contribution has already been processed." });
    }

    if (action === "approve") {
      contribution.status = "approved";
      await contribution.save();

      // Add contribution amount to campaign's amount_raised
      await Campaign.findByIdAndUpdate(contribution.campaign_id, {
        $inc: { amount_raised: contribution.contribution_amount },
      });

      await createNotification({
        message: `Your Contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was approved by ${contribution.creator_name}`,
        toEmail: contribution.supporter_email,
        actionRoute: "/dashboard/Supporter-home",
      });

      res.json({ success: true, message: "Contribution approved." });
    } else if (action === "reject") {
      contribution.status = "rejected";
      await contribution.save();

      // Refund credits to supporter
      await User.findOneAndUpdate(
        { email: contribution.supporter_email },
        { $inc: { credits: contribution.contribution_amount } }
      );

      await createNotification({
        message: `Your Contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was rejected by ${contribution.creator_name}`,
        toEmail: contribution.supporter_email,
        actionRoute: "/dashboard/Supporter-home",
      });

      res.json({ success: true, message: "Contribution rejected and refunded." });
    } else {
      res.status(400).json({ success: false, error: "Invalid action. Use 'approve' or 'reject'." });
    }
  } catch (error) {
    console.error("Review contribution error:", error);
    res.status(500).json({ success: false, error: "Failed to process contribution." });
  }
});

// GET: Fetch creator's withdrawal history and available raised credits
router.get("/withdrawals", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    // Calculate total raised credits across all approved campaigns
    const campaigns = await Campaign.find({
      creator_email: req.user.email,
      status: "approved",
    });
    const totalRaised = campaigns.reduce((sum, c) => sum + c.amount_raised, 0);

    // Calculate total already withdrawn credits
    const withdrawals = await Withdrawal.find({ creator_email: req.user.email });
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === "approved" || w.status === "pending")
      .reduce((sum, w) => sum + w.withdrawal_credit, 0);

    const availableCredits = totalRaised - totalWithdrawn;

    res.json({
      success: true,
      totalRaised,
      totalWithdrawn,
      availableCredits,
      withdrawals,
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch withdrawal data." });
  }
});

// POST: Submit withdrawal request
router.post("/withdrawals", authMiddleware, creatorOnly, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const { credits, payment_system, account_number } = req.body;

    if (!credits || !payment_system || !account_number) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    const creditsNum = Number(credits);
    if (creditsNum < 200) {
      return res.status(400).json({ success: false, error: "Minimum withdrawal is 200 credits ($10 USD)." });
    }

    // Verify available credits
    const campaigns = await Campaign.find({ creator_email: user.email, status: "approved" });
    const totalRaised = campaigns.reduce((sum, c) => sum + c.amount_raised, 0);
    const existingWithdrawals = await Withdrawal.find({ creator_email: user.email });
    const totalWithdrawn = existingWithdrawals
      .filter((w) => w.status === "approved" || w.status === "pending")
      .reduce((sum, w) => sum + w.withdrawal_credit, 0);
    const availableCredits = totalRaised - totalWithdrawn;

    if (creditsNum > availableCredits) {
      return res.status(400).json({ success: false, error: "Insufficient available credits." });
    }

    const withdrawal = new Withdrawal({
      creator_email: user.email,
      creator_name: user.name,
      withdrawal_credit: creditsNum,
      withdrawal_amount: creditsNum / 20, // 20 credits = $1
      payment_system,
      account_number,
      status: "pending",
    });

    await withdrawal.save();

    // Notify admins
    const admins = await User.find({ role: "Admin" }).select("email");
    for (const admin of admins) {
      await createNotification({
        message: `${user.name} has requested a withdrawal of ${creditsNum} credits ($${(creditsNum / 20).toFixed(2)}).`,
        toEmail: admin.email,
        actionRoute: "/dashboard/admin-withdrawals",
      });
    }

    res.json({ success: true, withdrawal });
  } catch (error) {
    console.error("Create withdrawal error:", error);
    res.status(500).json({ success: false, error: "Failed to submit withdrawal." });
  }
});

module.exports = router;
