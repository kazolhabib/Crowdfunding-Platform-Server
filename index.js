/**
 * @file index.js
 * @description Main entry point for the Crowdfunding Platform companion API server.
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const campaignRoutes = require("./routes/campaignRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const supporterRoutes = require("./routes/supporterRoutes");
const { handleStripeWebhook } = require("./routes/paymentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// Stripe webhook must receive raw body
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());

app.use("/api/campaigns", campaignRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/supporter", supporterRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Crowdfunding Platform API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
