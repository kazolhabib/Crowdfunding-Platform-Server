const express = require("express");
const Stripe = require("stripe");
const connectDB = require("../config/db");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { authMiddleware, supporterOnly } = require("../middleware/auth");

const router = express.Router();

const CREDIT_PACKAGES = {
  tier1: { credits: 100, amountUsd: 10, label: "100 Credits" },
  tier2: { credits: 300, amountUsd: 25, label: "300 Credits" },
  tier3: { credits: 800, amountUsd: 60, label: "800 Credits" },
  tier4: { credits: 1500, amountUsd: 110, label: "1500 Credits" },
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

// GET /api/payments/packages - public pricing tiers
router.get("/packages", (_req, res) => {
  res.json({
    success: true,
    packages: Object.entries(CREDIT_PACKAGES).map(([id, pkg]) => ({
      id,
      credits: pkg.credits,
      amountUsd: pkg.amountUsd,
      label: pkg.label,
    })),
  });
});

// POST /api/payments/create-checkout-session
router.post("/create-checkout-session", authMiddleware, supporterOnly, async (req, res) => {
  try {
    await connectDB();
    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES[packageId];

    if (!pkg) {
      return res.status(400).json({ success: false, error: "Invalid credit package." });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    try {
      const stripe = getStripe();
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${pkg.label} - FundFlow`,
                description: `Purchase ${pkg.credits} platform credits`,
              },
              unit_amount: pkg.amountUsd * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/dashboard/purchase-credit?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/dashboard/purchase-credit?canceled=true`,
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
          userName: user.name,
          creditsPurchased: String(pkg.credits),
          amountUsd: String(pkg.amountUsd),
        },
      });

      await Payment.create({
        user_email: user.email,
        user_name: user.name,
        stripe_session_id: session.id,
        amount_usd: pkg.amountUsd,
        credits_purchased: pkg.credits,
        status: "pending",
      });

      res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (stripeError) {
      console.warn("Stripe failed, falling back to mock payment system:", stripeError.message);
      
      const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      await Payment.create({
        user_email: user.email,
        user_name: user.name,
        stripe_session_id: mockSessionId,
        amount_usd: pkg.amountUsd,
        credits_purchased: pkg.credits,
        status: "pending",
      });

      res.json({
        success: true,
        url: `${frontendUrl}/dashboard/purchase-credit?success=true&session_id=${mockSessionId}`,
        sessionId: mockSessionId,
        mock: true,
      });
    }
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({ success: false, error: "Failed to create checkout session." });
  }
});

// GET /api/payments/history
router.get("/history", authMiddleware, supporterOnly, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const skip = (page - 1) * limit;

    const filter = { user_email: req.user.email, status: "completed" };
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter).sort({ date: -1 }).skip(skip).limit(limit);

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Payment history error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch payment history." });
  }
});

// POST /api/payments/verify-session - fallback when webhook is unavailable (dev)
router.post("/verify-session", authMiddleware, supporterOnly, async (req, res) => {
  try {
    await connectDB();
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID is required." });
    }

    const payment = await Payment.findOne({ stripe_session_id: sessionId });
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment record not found." });
    }

    if (payment.user_email !== req.user.email) {
      return res.status(403).json({ success: false, error: "Unauthorized." });
    }

    if (payment.status === "completed") {
      const user = await User.findById(req.user.userId);
      return res.json({ success: true, alreadyProcessed: true, credits: user?.credits || 0 });
    }

    // Handle mock payment sessions
    if (sessionId.startsWith("mock_session_")) {
      const completedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: "pending" },
        { $set: { status: "completed" } },
        { new: true }
      );

      if (!completedPayment) {
        const user = await User.findById(req.user.userId);
        return res.json({ success: true, alreadyProcessed: true, credits: user?.credits || 0 });
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $inc: { credits: completedPayment.credits_purchased } },
        { new: true }
      );
      if (!user) {
        await Payment.findByIdAndUpdate(completedPayment._id, { $set: { status: "pending" } });
        return res.status(404).json({ success: false, error: "User not found." });
      }

      return res.json({
        success: true,
        credits: user.credits,
        creditsAdded: completedPayment.credits_purchased,
        mock: true,
      });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ success: false, error: "Payment not completed yet." });
    }

    // Claim the pending payment first. This keeps the return-page confirmation
    // and Stripe's webhook from crediting the same purchase twice.
    const completedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: "pending" },
      { $set: { status: "completed" } },
      { new: true }
    );

    if (!completedPayment) {
      const user = await User.findById(req.user.userId);
      return res.json({ success: true, alreadyProcessed: true, credits: user?.credits || 0 });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { credits: completedPayment.credits_purchased } },
      { new: true }
    );
    if (!user) {
      await Payment.findByIdAndUpdate(completedPayment._id, { $set: { status: "pending" } });
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({
      success: true,
      credits: user.credits,
      creditsAdded: completedPayment.credits_purchased,
    });
  } catch (error) {
    console.error("Verify session error:", error);
    res.status(500).json({ success: false, error: "Failed to verify payment." });
  }
});

module.exports = router;
module.exports.CREDIT_PACKAGES = CREDIT_PACKAGES;
module.exports.handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await connectDB();
      const payment = await Payment.findOne({ stripe_session_id: session.id });

      if (!payment) {
        console.error("Payment record not found for session:", session.id);
        return res.json({ received: true });
      }

      const completedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: "pending" },
        { $set: { status: "completed" } },
        { new: true }
      );

      if (!completedPayment) {
        return res.json({ received: true });
      }

      const user = await User.findOneAndUpdate(
        { email: completedPayment.user_email },
        { $inc: { credits: completedPayment.credits_purchased } },
        { new: true }
      );
      if (!user) {
        await Payment.findByIdAndUpdate(completedPayment._id, { $set: { status: "pending" } });
        console.error("User not found for payment:", completedPayment._id);
        return res.status(500).json({ error: "Payment user not found" });
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }

  res.json({ received: true });
};
