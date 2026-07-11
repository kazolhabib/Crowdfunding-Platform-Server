const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const campaignRoutes = require("./routes/campaignRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/campaigns", campaignRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Crowdfunding Platform API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
