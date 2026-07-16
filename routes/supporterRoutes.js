const express = require("express");
const connectDB = require("../config/db");
const Contribution = require("../models/Contribution");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /api/supporter/contributions: Fetch supporter's contribution history and stats
router.get("/contributions", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const email = req.user.email;

    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10) || 10));
    const skip = (page - 1) * limit;

    const total = await Contribution.countDocuments({ supporter_email: email });
    const contributions = await Contribution.find({ supporter_email: email })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const statsArray = await Contribution.aggregate([
      { $match: { supporter_email: email } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approvedTotal: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$contribution_amount", 0] },
          },
        },
      },
    ]);

    const stats = statsArray[0] || { totalCount: 0, pendingCount: 0, approvedTotal: 0 };

    res.json({
      success: true,
      contributions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
    });
  } catch (error) {
    console.error("Get supporter contributions error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch contributions." });
  }
});

module.exports = router;
